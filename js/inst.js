function nop() {
    return new Instruction('nop');
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

function populate_code() {
    var code_table = $("#prog");
    for (var i in asm_code) {
        code_table.append($("<tr>").append(
                        $("<td>").html(hex(i * 2 + 0x100)),
                        $("<td>").html(asm_code[i].toString())
                    ));
    }
}

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
        if(this.rx !== undefined) s += " R" + this.rx;
        if(this.ry !== undefined) s += " R" + this.ry;
        if(this.rz !== undefined) s += " R" + this.rz;
        if(this.im !== undefined) s += " [" + hex(this.im) + "]";
        return s; 
    };
}
