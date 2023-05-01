pub const InstructionOpCode = enum { PUSH_BUILTIN, PUSH_CLOSURE, PUSH_DATA, PUSH_DATA_ITEM, PUSH_FALSE, PUSH_INT, PUSH_STRING, PUSH_TRUE, PUSH_TUPLE, PUSH_TUPLE_ITEM, PUSH_UNIT, PUSH_VAR, DUP, DISCARD, SWAP, ADD, SUB, MUL, DIV, EQ, JMP, JMP_DATA, JMP_FALSE, JMP_TRUE, SWAP_CALL, ENTER, RET, STORE_VAR };
pub const OpParameter = enum { OP_INT, OP_LABEL, OP_BUILT_IN, OP_STRING };

pub const Instruction = struct {
    name: []const u8,
    opCode: InstructionOpCode,
    parameters: []const OpParameter,
};

pub const instructions = [_]Instruction{
    .{ .name = "PUSH_BUILTIN", .opCode = InstructionOpCode.PUSH_BUILTIN, .parameters = &[_]OpParameter{OpParameter.OP_BUILT_IN} },
    .{ .name = "PUSH_CLOSURE", .opCode = InstructionOpCode.PUSH_CLOSURE, .parameters = &[_]OpParameter{OpParameter.OP_LABEL} },
    .{ .name = "PUSH_DATA", .opCode = InstructionOpCode.PUSH_DATA, .parameters = &[_]OpParameter{ OpParameter.OP_LABEL, OpParameter.OP_INT, OpParameter.OP_INT } },
    .{ .name = "PUSH_DATA_ITEM", .opCode = InstructionOpCode.PUSH_DATA_ITEM, .parameters = &[_]OpParameter{OpParameter.OP_INT} },
    .{ .name = "PUSH_FALSE", .opCode = InstructionOpCode.PUSH_FALSE, .parameters = &[_]OpParameter{} },
    .{ .name = "PUSH_INT", .opCode = InstructionOpCode.PUSH_INT, .parameters = &[_]OpParameter{OpParameter.OP_INT} },
    .{ .name = "PUSH_STRING", .opCode = InstructionOpCode.PUSH_STRING, .parameters = &[_]OpParameter{OpParameter.OP_STRING} },
    .{ .name = "PUSH_TRUE", .opCode = InstructionOpCode.PUSH_TRUE, .parameters = &[_]OpParameter{} },
    .{ .name = "PUSH_TUPLE", .opCode = InstructionOpCode.PUSH_TUPLE, .parameters = &[_]OpParameter{OpParameter.OP_INT} },
    .{ .name = "PUSH_TUPLE_ITEM", .opCode = InstructionOpCode.PUSH_TUPLE_ITEM, .parameters = &[_]OpParameter{OpParameter.OP_INT} },
    .{ .name = "PUSH_UNIT", .opCode = InstructionOpCode.PUSH_UNIT, .parameters = &[_]OpParameter{} },
    .{ .name = "PUSH_VAR", .opCode = InstructionOpCode.PUSH_VAR, .parameters = &[_]OpParameter{ OpParameter.OP_INT, OpParameter.OP_INT } },
    .{ .name = "DUP", .opCode = InstructionOpCode.DUP, .parameters = &[_]OpParameter{} },
    .{ .name = "DISCARD", .opCode = InstructionOpCode.DISCARD, .parameters = &[_]OpParameter{} },
    .{ .name = "SWAP", .opCode = InstructionOpCode.SWAP, .parameters = &[_]OpParameter{} },
    .{ .name = "ADD", .opCode = InstructionOpCode.ADD, .parameters = &[_]OpParameter{} },
    .{ .name = "SUB", .opCode = InstructionOpCode.SUB, .parameters = &[_]OpParameter{} },
    .{ .name = "MUL", .opCode = InstructionOpCode.MUL, .parameters = &[_]OpParameter{} },
    .{ .name = "DIV", .opCode = InstructionOpCode.DIV, .parameters = &[_]OpParameter{} },
    .{ .name = "EQ", .opCode = InstructionOpCode.EQ, .parameters = &[_]OpParameter{} },
    .{ .name = "JMP", .opCode = InstructionOpCode.JMP, .parameters = &[_]OpParameter{OpParameter.OP_LABEL} },
    .{ .name = "JMP_DATA", .opCode = InstructionOpCode.JMP_DATA, .parameters = &[_]OpParameter{} },
    .{ .name = "JMP_FALSE", .opCode = InstructionOpCode.JMP_FALSE, .parameters = &[_]OpParameter{OpParameter.OP_LABEL} },
    .{ .name = "JMP_TRUE", .opCode = InstructionOpCode.JMP_TRUE, .parameters = &[_]OpParameter{OpParameter.OP_LABEL} },
    .{ .name = "SWAP_CALL", .opCode = InstructionOpCode.SWAP_CALL, .parameters = &[_]OpParameter{} },
    .{ .name = "ENTER", .opCode = InstructionOpCode.ENTER, .parameters = &[_]OpParameter{OpParameter.OP_INT} },
    .{ .name = "RET", .opCode = InstructionOpCode.RET, .parameters = &[_]OpParameter{} },
    .{ .name = "STORE_VAR", .opCode = InstructionOpCode.STORE_VAR, .parameters = &[_]OpParameter{OpParameter.OP_INT} },
};
