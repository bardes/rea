is_precise = true;
stack_pos = 0x0ff4;

function hex(n) {
    return '0x' + ("0000" + n.toString(16)).slice(-4).toUpperCase();
}
//===============================
//=========== OPCODES ===========
//===============================
//  NOP: No Operation
//  ADD: Rx <- Ry + Rz
//  ADI: Rx <- Ry + [8bit int]
//  MUL: Rx <- Ry * Rz
//  DIV: Rx <- Ry / Rz
//  SWP: Swap Rx <-> Ry
//  AND: Rx <- Ry & Rz
//   OR: Rx <- Ry | Rz
//  XOR: Rx <- Ry ^ Rz
//  NOT: Rx < ~Rx
//  JMP: PC <- Rx
//  BEQ: PC <- Rx if Ry == Rz
//  BEI: PC <- Rx if Ry == [8bit int]
//   LI: Rx <- [16bit int]
//   LW: Rx <- mem[Ry]
//   SW: Mem[Rx] <- Ry
//  PSH: Mem[SP--] <- Rx
//  POP: Rx <- Mem[++SP]
//===============================

function Instruction(op, rx, ry, rz) {
    this.op = op;
    this.rx = undefined;
    this.ry = undefined;
    this.rz = undefined;
    this.im = undefined;

    // Validates the opcode and operands
    switch(op.toLowerCase()) {
        case "add":
        case "mul":
        case "div":
        case "and":
        case "or":
        case "xor":
        case "beq":
            if(rz === undefined) {
                console.error("Missing operand Rz for operation: " + op);
                this.op = undefined;
            }
            this.rz = rz;

        case "swp":
        case "lw":
        case "sw":
            if(ry === undefined) {
                console.error("Missing operand Ry for operation: " + op);
                this.op = undefined;
            }
            this.ry = ry;

        case "psh":
        case "pop":
        case "not":
        case "jmp":
            if(rx === undefined) {
                console.error("Missing operand Rx for operation: " + op);
                this.op = undefined;
            }
            this.rx = rx;

        case "hlt":
        case "nop":
            break;

        case "adi":
        case "bei":
            if(rx === undefined) {
                console.error("Missing operand Rx for operation: " + op);
                this.op = undefined;
            }
            if(ry === undefined) {
                console.error("Missing operand Ry for operation: " + op);
                this.op = undefined;
            }
            if(rz === undefined) {
                console.error("Missing immediate operand for operation: " + op);
                this.op = undefined;
            }

            this.rx = rx;
            this.ry = ry;
            this.im = rz;
        break;

        case "li":
            if(rx === undefined) {
                console.error("Missing operand Rx for operation: " + op);
                this.op = undefined;
            }
            if(ry === undefined) {
                console.error("Missing immediate operand for operation: " + op);
                this.op = undefined;
            }

            this.rx = rx;
            this.im = ry;
        break;
        
        default:
            this.op = "nop";
            console.error("Unknown opcode! This instruction will be ignored! (set to NOP)");
    }

    if(this.op === undefined)
        this.op = "nop";

    this.toString = function() {
        var s = this.op.toUpperCase();
        if(this.rx != undefined) s += " R" + this.rx;
        if(this.ry != undefined) s += " R" + this.ry;
        if(this.rz != undefined) s += " R" + this.rz;
        if(this.im != undefined) s += " [" + hex(this.im) + "]";
        return s; 
    };
}

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

function nop() {
    return new Instruction('nop');
}

function Simulation(code) {
    this.state = "reset";       // Simulation starts in "reset" mode
    this.substate = undefined;  // Used during interrupt handling
    this.is_precise = true;     // Which kind of interrupt is set to happen

    this.code = code.slice();   // Gets the code on creation
    this.pc = 0;                // Entry point at begining of .text
    this.psw = 0xFFFF;          // No meaning for the bits (for now?)
    this.sp = 0xFFFE;           // Stack starts empty
    this.stack = [];            // Stack's content
    this.data = [];             // Program data
    
    this.gpr = [0,0,0,0];       // Data registers start zeroed

    // Instructions on the pipeline
    this.pipeline = [
        nop(),
        nop(),
        nop(),
        nop(),
        nop()
    ]; 

    this.display = function() {

        // Display the instructions
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

        //Display the pipeline
        $("#fetch").html(this.pipeline[0].toString());
        $("#decode").html(this.pipeline[1].toString());
        $("#execute").html(this.pipeline[2].toString());
        $("#memory").html(this.pipeline[3].toString());
        $("#wback").html(this.pipeline[4].toString());

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
        for(var i in this.stack)
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
    }

    // Verifica se ha interrupções no pipeline e ajusta o estado de acordo
    this.verify_interrupt = function() {
        if(this.state == "halt")
            return;
        
        if(this.pipeline[2].op == "div" && this.gpr[this.pipeline[2].rz] == 0) {
            this.state = "interrupt";
            this.substate = this.is_precise ? "p_detected" : "i_detected";
            setHint("Divisão por zero detectada!");
            $("#execute").addClass("danger");
            return;
        } else if(this.pipeline[2].op == "mul" &&
                this.gpr[this.pipeline[2].ry] * this.gpr[this.pipeline[2].rz] > 65535) {
            this.state = "interrupt";
            this.substate = this.is_precise ? "p_detected" : "i_detected";
            setHint("Overflow detectado!");
            $("#execute").addClass("danger");
            return;
        }

        this.state = "running";
    };

    // Passa por todas as etapas de uma interrupt
    this.handle_interrupt = function() {
        switch(this.substate) {
            case "i_detected":
                this.substate = "halt";
                setHint("Interrupções imprecisas não implementadas!");
                break;

            case "p_detected":
                setHint("Tratando interupção precisa.");
                this.substate = "p_empty";
                break;

            case "p_empty":
                if(this.pipeline[3].op == 'nop' && this.pipeline[4].op == 'nop') {
                    setHint("Não há mais instruções para terminar.");
                    this.substate = 'p_change_pc';
                } else {
                    setHint("Termina de executar as intruções que entraram antes da interrupção.")
                    this.commit(this.pipeline[4]);
                    this.pipeline[4] = this.pipeline[3];
                    this.pipeline[3] = nop();
                }
                break;

            case "p_change_pc":
                setHint("Reposiciona PC logo apontando para a instrução seguinte á interrompida.");
                this.pc -= 2;
                this.substate = "p_clear";
                break;

            case "p_clear":
                setHint("Esvazia o conteúdo do pipeline.");
                this.pipeline[0] = this.pipeline[1] = this.pipeline[2] = nop();
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
    };

    this.advance = function() {
        if(this.state == "halt") return;
        else if(this.state == "interrupt") return this.handle_interrupt();
        
        // Tenta pegar a prox instrução e avançar PC
        var inst = this.code[(this.pc++)] || nop();

        // Insere ela no inicio do pipeline
        this.pipeline.unshift(inst);

        // Aplica os calculos da instrução finalizada e tira do pipeline
        this.commit(this.pipeline.pop());

        this.psw = Math.floor(Math.random() * 65536);

        this.verify_interrupt();
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
    $("#advance").hover(function(){setHint("Avança a simulação. (Um pulso de clock)");}, clearHint);
    $("#int-type").hover(function(){setHint("Escolhe entre interrupções precisas ou imprecisas.");}, clearHint);
}

function disableHints() {
    $("#reset, #advance, #int-type").unbind("mouseenter mouseleave");
    clearHint();
}

// Código simulado (por enquanto "hardcoded")
asm_code = new Array;
asm_code.push(new Instruction('li', 0, 1337));
asm_code.push(new Instruction('li', 1, 42));
asm_code.push(nop());
asm_code.push(nop());
asm_code.push(new Instruction('add', 2, 1, 0));
asm_code.push(nop());
asm_code.push(new Instruction('psh', 2));
asm_code.push(new Instruction('mul', 2, 2, 1));
asm_code.push(nop());
asm_code.push(new Instruction('psh', 2));
asm_code.push(new Instruction('mul', 2, 2, 1));
asm_code.push(new Instruction('pop', 3));
asm_code.push(nop());
asm_code.push(nop());
asm_code.push(new Instruction('div', 3, 2, 3));
asm_code.push(new Instruction('pop', 1));
asm_code.push(nop());
asm_code.push(nop());
asm_code.push(new Instruction('add', 0, 3, 1));
asm_code.push(new Instruction('hlt'));
asm_code.push(nop());
asm_code.push(nop());
asm_code.push(nop());
asm_code.push(nop());
asm_code.push(nop());


// Ponto de "entrada" (Document Ready)
$(function() {
    // Garante que a simulação está num estado válido quando mostrar a página
    sim = new Simulation(asm_code);
    enableHints();

    // Garante que o botão mostre o estado certo
    $("#int-type").html(sim.is_precise ? "Precisa" : "Imprecisa");

    // Configura o botão para togglar precisa/imprecisa
    $("#int-type").click(function(){
        sim.is_precise = !sim.is_precise;
        $("#int-type").html(sim.is_precise ? "Precisa" : "Imprecisa");
    });

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
