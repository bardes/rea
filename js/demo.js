is_precise = true;

/* 0xFFFF
 * [stack]
 *  vvvvv (grows down)
 *
 *  ^^^^^ (grows up)
 * [data section]
 * 0x8000
 * [Text Section]
 * 0x0100
 * [Interrupt Vector]
 * 0x0000
 */
function prepare_stack_entry(entry) {
    if(entry[0] == 'pc')
        return $("<tr>").append(
                    $("<td>"),
                    $("<td>").html(hex(entry[1])),
                    $("<td>").addClass('pc').html(hex(entry[2] * 2 + 0x0100))
                );
        
    return $("<tr>").append(
                $("<td>"),
                $("<td>").html(hex(entry[1])),
                $("<td>").addClass(entry[0]).html(entry[0] == "achurado" ? entry[2] : hex(entry[2]))
            );
}

function Simulation(code) {
    this.state = "reset";       // Simulation starts in "reset" mode
    this.substate = undefined;  // Used during interrupt handling
    this.is_precise = true;     // Which kind of interrupt is set to happen

    this.code = code;           // Gets the code on creation
    this.pc = 0;                // Entry point at begining of .text
    this.psw = 0xFFFF;          // No meaning for the bits (for now?)
    this.sp = 0xFFFE;           // Stack starts empty
    this.stack = [];            // Stack's content
    this.data = [];             // Program data
    this.gambi = 0;
    
    this.gpr = [0,0,0,0];       // Data registers start zeroed

    // Pipeline starts empty
    this.pipeline = [];

    this.finished = []; // Finished instructions

    this.put_instruction = function(inst, addr, type, side_info) {
        var elem = $("<tr>").addClass(type).append(
                       $("<td>").html(side_info),
                       $("<td>").html(addr !== undefined && hex(addr) || '---'),
                       $("<td>").html(inst.toString())
                    );
        $("#prog>tbody").append(elem);
    };

    this.display = function() {

        // Display the instructions
        var lines = 14;
        $("#prog>tbody>*").remove();
        for (var i = this.pc + 3; i >= this.pc; --i, --lines)
            this.put_instruction(this.code[i] || nop(), 0x100 + 2*i, "not_executed", "Não Exec.");

        /*
        --lines;
        this.put_instruction(this.code[i] || nop(), 0x100 + 2*i--, "not_executed",
                '[PC] <span class="text-right glyphicon glyphicon-arrow-right"></span>');
        */

        for (var j in this.pipeline) {
            if(j == this.interrupt_pos)
                this.put_instruction(this.pipeline[j], (i - j + this.gambi)*2 + 0x100, "danger", "Interrompida");
            else
                this.put_instruction(this.pipeline[j], (i - j + this.gambi)*2 + 0x100, "pipeline", "Executando");
            --lines;
        }
        
        
        // Insere as instruções dentro do pipe line
        for (j = 0; lines && j < this.finished.length; ++j, --lines)
            this.put_instruction(this.finished[j], (i - this.pipeline.length - j + this.gambi)*2 + 0x100, "executed", "Executada");
        
        for (; lines; --lines)
            this.put_instruction("---", undefined, undefined, "---");
        
        
        /*
        $("#a0").html(hex(this.pc * 2 + 0x0100));
        $("#a1").html(hex((this.pc + 1) * 2 + 0x0100));
        $("#a2").html(hex((this.pc + 2) * 2 + 0x0100));
        if(this.code[this.pc])
            $("#i0").html(this.code[this.pc].toString()).removeClass("achurado");
        else
            $("#i0").html("[LIXO]").addClass("achurado");

        if(this.code[this.pc + 1])
            $("#i1").html(this.code[this.pc + 1].toString()).removeClass("achurado");
        else
            $("#i1").html("[LIXO]").addClass("achurado");

        if(this.code[this.pc + 2])
            $("#i2").html(this.code[this.pc + 2].toString()).removeClass("achurado");
        else
            $("#i2").html("[LIXO]").addClass("achurado");
        */

        // Displays the registers
        $("#pc").html(hex(this.pc * 2 + 0x0100));
        $("#sp").html(hex(this.sp));
        $("#psw").html(hex(this.psw));
        $("#r0").html("[R0]: " + hex(this.gpr[0]));
        $("#r1").html("[R1]: " + hex(this.gpr[1]));
        $("#r2").html("[R2]: " + hex(this.gpr[2]));
        $("#r3").html("[R3]: " + hex(this.gpr[3]));

        // Displays the stack
        $("#stack>tbody>*").remove();
        for(i in this.stack)
            $("#stack>tbody").prepend(prepare_stack_entry(this.stack[i]));

        var stack_row = prepare_stack_entry(['achurado', this.sp, "[LIXO]"]);
        var stack_border = stack_row.find("td")[0];
        $(stack_border).append( "[SP] ", $("<span>").addClass("text-right glyphicon glyphicon-arrow-right"));
        $(stack_border).addClass('sp');
        $("#stack>tbody").prepend(stack_row);
        $("#stack>tbody").prepend(prepare_stack_entry(['achurado', this.sp - 2, "[LIXO]"]));
        $("#stack>tbody").prepend(prepare_stack_entry(['achurado', this.sp - 4, "[LIXO]"]));
    };
    
    this.push_pc = function() {
        this.stack.push(['pc', this.sp, this.pc]);
        this.sp -= 2;
    };

    this.push_psw = function() {
        this.stack.push(['psw', this.sp, this.psw]);
        this.sp -= 2;
    };

    this.push_r = function(n) {
        this.stack.push(['gpr', this.sp, this.gpr[n]]);
        this.sp -= 2;
    };

    this.pop_r = function(n) {
        this.gpr[n] = this.stack.pop()[2];
        this.sp += 2;
    };

    // Verifica se ha interrupções no pipeline e ajusta o estado de acordo
    this.verify_interrupt = function() {
        if(this.state == "halt")
            return;
        
        if (this.pipeline.length > 2) {
            if(this.pipeline[2].op == "div" && this.gpr[this.pipeline[2].rz] === 0) {
                this.state = "interrupt";
                this.substate = this.is_precise ? "p_detected" : "i_detected";
                setHint("Divisão por zero detectada!");
                return 2;
            } else if(this.pipeline[2].op == "mul" &&
                    this.gpr[this.pipeline[2].ry] * this.gpr[this.pipeline[2].rz] > 65535) {
                this.state = "interrupt";
                this.substate = this.is_precise ? "p_detected" : "i_detected";
                setHint("Overflow detectado!");
                return 2;
            }
        }

        this.state = "running";
    };

    // Passa por todas as etapas de uma interrupt
    this.handle_interrupt = function() {
        switch(this.substate) {
            case "i_detected":
                this.state = "halt";
                setHint("Interrupções imprecisas não implementadas!");
                break;

            case "p_detected":
                setHint("Tratando interupção precisa.");
                this.substate = "p_empty";
                break;

            case "p_empty":
                if(this.pipeline.length > this.interrupt_pos + 1) {
                    setHint("Termina de executar as intruções que entraram antes da interrupção.")
                    this.commit(this.pipeline.pop());
                } else {
                    setHint("Não há mais instruções para terminar.");
                    this.substate = 'p_change_pc';
                }
                break;

            case "p_change_pc":
                setHint("Reposiciona PC logo apontando para a instrução seguinte á interrompida.");
                this.pc -= this.pipeline.length - 1;
                this.substate = "p_clear";
                this.gambi = this.pipeline.length - 1;
                break;

            case "p_clear":
                setHint("Esvazia o conteúdo do pipeline.");
                this.gambi = -1;
                this.pipeline = [];
                this.substate = "p_push_pc";
                $("#execute").removeClass("danger");
                break;

            case "p_push_pc":
                setHint("Coloca o PC na pilha.");
                this.push_pc();
                this.substate = "p_push_psw";
                break;

            case "p_push_psw":
                setHint("Coloca o PSW na pilha.");
                this.push_psw();
                this.substate = "p_push_gpr";
                break;

            case "p_push_gpr":
                setHint("Coloca os RPGs na pilha.");
                this.push_r(0);
                this.push_r(1);
                this.push_r(2);
                this.push_r(3);
                this.substate = "p_handle";
                break;

            case "p_handle":
                setHint("Rotina de tratamento de interrupção é executada.");
                this.substate = "p_return";
                break;

            case "p_return":
                setHint("Execução normal é retomada.");
                this.pop_r(3);
                this.pop_r(2);
                this.pop_r(1);
                this.pop_r(0);
                this.psw = this.stack.pop()[2];
                this.pc = this.stack.pop()[2];
                this.sp += 4;
                this.state = "running";
                this.finished.unshift(this.code[this.pc - 1]);
                this.gambi = 0;
                break;
            
        }
    };

    // Aplica a instrução dada
    this.commit = function(inst) {
        switch(inst.op) {
            case "add":
                this.gpr[inst.rx] = this.gpr[inst.ry] + this.gpr[inst.rz];
                break;

            case "adi":
                this.gpr[inst.rx] = this.gpr[inst.ry] + inst.im;
                break;
            
            case "mul":
                this.gpr[inst.rx] = this.gpr[inst.ry] * this.gpr[inst.rz];
                break;

            case "div":
                this.gpr[inst.rx] = Math.floor(this.gpr[inst.ry] / this.gpr[inst.rz]);
                break;

            case "swp":
                var tmp = this.gpr[inst.rx];
                this.gpr[inst.rx] = this.gpr[this.ry];
                this.gpr[inst.ry] = tmp;
                break;


            case "li":
                this.gpr[inst.rx] = inst.im;
                break;

            case "psh":
                this.push_r(inst.rx);
                break;

            case "pop":
                this.pop_r(inst.rx);
                break;

            case "hlt":
                this.state = "halt";
                setHint("HALT!");
                break;

            default:
                console.error("Invalid instruction: " + inst.op);
            case "nop":
        }
        this.finished.unshift(inst);
    };

    this.advance = function() {
        if(this.state == "halt") return;
        else if(this.state == "interrupt") return this.handle_interrupt();
        
        // Tenta pegar a prox instrução e avançar PC
        var inst = this.code[(this.pc++)] || nop();

        // Insere ela no inicio do pipeline
        this.pipeline.unshift(inst);

        // Aplica os calculos da instrução finalizada e tira do pipeline
        if(this.pipeline.length > 5)
            this.commit(this.pipeline.pop());

        this.psw = Math.floor(Math.random() * 65536);

        this.interrupt_pos = this.verify_interrupt();
    };

    this.display();
}

function setHint(msg) {
    $("#hint").html(msg);
}

function clearHint() {
    setHint("");
}

function setHintTitle(t) {
    $("hint-title").html(t);
}

function clearHintTitle() {
    setHintTitle("");
}

function enableHints() {
    $("#reset").hover(function(){setHint("Reinicia a simulação.");}, clearHint);
    $("#advance").hover(function(){setHint("Avança a simulação.");}, clearHint);
    //$("#int-type").hover(function(){setHint("Escolhe entre interrupções precisas ou imprecisas.");}, clearHint);
}

function disableHints() {
    //$("#reset, #advance, #int-type").unbind("mouseenter mouseleave");
    $("#reset, #advance").unbind("mouseenter mouseleave");
    clearHint();
}

// Ponto de "entrada" (Document Ready)
$(function() {
    // Garante que a simulação está num estado válido quando mostrar a página
    sim = new Simulation(asm_code);
    enableHints();

    // Garante que o botão mostre o estado certo
    //$("#int-type").html(sim.is_precise ? "Precisa" : "Imprecisa");

    /*
    // Configura o botão para togglar precisa/imprecisa
    $("#int-type").click(function(){
        sim.is_precise = !sim.is_precise;
        $("#int-type").html(sim.is_precise ? "Precisa" : "Imprecisa");
    });
    */

    // Configura o botão de avançar a simulação
    $("#advance").click(function() {
        if(sim.state == "reset")
            disableHints();

        sim.advance();
        sim.display();
    });

    // Configura o botão de reset
    $("#reset").click(function() {
        if(sim.state != "reset") {
            sim = new Simulation(asm_code);
            enableHints();
            $("#execute").removeClass("danger");
        }
    });

});
