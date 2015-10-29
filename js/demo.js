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

        case "nop":
            break;

        case "adi":
        case "bei":
            if(rx === undefined)
                console.error("Missing operand Rx for operation: " + op);
            if(ry === undefined)
                console.error("Missing operand Ry for operation: " + op);
            if(rz === undefined)
                console.error("Missing immediate operand for operation: " + op);

            this.rx = rx;
            this.ry = ry;
            this.im = rz;
            this.op = rx && ry && rz && op;
        break;

        case "li":
            if(rx === undefined)
                console.error("Missing operand Rx for operation: " + op);
            if(ry === undefined)
                console.error("Missing immediate operand for operation: " + op);

            this.rx = rx;
            this.im = ry;
            this.op = rx && ry && op;
        break;
        
        default:
            this.op = op;
            console.error("Unknown opcode! This instruction will be ignored!");
    }
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
    if(entry[0] == 'pc') {
        return $("<tr>").append(
                    $("<td>"),
                    $("<td>").html(hex(entry[1])),
                    $("<td>").addClass("pc").html(hex(entry[2]))
                );
    } else if (entry[0] == 'psw') {
    } else {
    }
}

function Simulation(code) {
    this.state = "reset";       // Sim. starts in "reset" mode
    this.is_precise = true;     // Which kind of interrupt is set to happen

    this.code = code;           // Gets the code on creation
    this.pc = 0x0100;           // Entry point at begining of .text
    this.psw = 0xFFFF;          // No meaning for the bits (for now?)
    this.sp = 0xFFFE;           // Stack starts empty
    this.stack = [];            // Stack's content
    this.data = [];             // Program data
    
    this.gpr = [0,0,0,0];       // Data registers start zeroed

    this.display = function() {

        // Displays the registers
        $("#pc").html(hex(this.pc));
        $("#sp").html(hex(this.sp));
        $("#psw").html(hex(this.psw));
        var _gpr = this.gpr;
        var _r = $("#gpr>.gpr"); 
        $.each(_r, function(i) {
            _r[i].innerHTML = hex(_gpr[i]);
        });

        // Displays the stack
        $("#stack>tbody>.stack").remove();
        for(var i in this.stack)
            $("#stack>tbody").prepend(prepare_stack_entry(this.stack[i]));
    };
    
    this.push_pc = function() {
        this.stack.push(['pc', this.sp, this.pc]);
        this.sp -= 2;
    };

    this.push_psw = function() {
        this.stack.push(['psw', this.sp, this.psw]);
        this.sp -= 2;
    };

    this.advance = function() {
        if(this.state == "halt") return;
        
    };

    this.display();
}

function setHint(msg) {
    $("#help").html(msg);
}

function clearHint() {
    setHint("");
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
asm_code.push(new Instruction('mul', 2, 1, 0));


$(function() {
    // Garante que a simulação está num estado válido quando mostrar a página
    sim = new Simulation(asm_code);
    enableHints();

    // Garante que o botão mostre o estado certo
    $("#int-type").html(is_precise ? "Precisa" : "Imprecisa");

    // Configura o botão para togglar precisa/imprecisa
    $("#int-type").click(function(){
        sim.is_precise = !sim.is_precise;
        $("#int-type").html(is_precise ? "Precisa" : "Imprecisa");
    });

    // Configura o botão de avançar a simulação
    $("#advance").click(function() {
        /*$("#stack > tbody:last-child").prepend($("<tr>").append(
                    $("<td>").html(hex(stack_pos)),
                    $("<td>").html("[Vazio]").addClass("achurado")
                    ));*/

        if(sim.state == "reset")
            disableHints();

        sim.advance();
    });

    // Configura o botão de reset
    $("#reset").click(function() {
        if(sim.state != "reset") {
            sim = new Simulation(asm_code);
            enableHints();
        }
    });

});


