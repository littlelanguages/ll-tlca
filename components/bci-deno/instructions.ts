export enum InstructionOpCode {
  PUSH_BUILTIN,
  PUSH_CLOSURE,
  PUSH_DATA,
  PUSH_DATA_ITEM,
  PUSH_FALSE,
  PUSH_INT,
  PUSH_STRING,
  PUSH_TRUE,
  PUSH_TUPLE,
  PUSH_TUPLE_ITEM,
  PUSH_UNIT,
  PUSH_VAR,
  DUP,
  DISCARD,
  SWAP,
  ADD,
  SUB,
  MUL,
  DIV,
  EQ,
  JMP,
  JMP_DATA,
  JMP_FALSE,
  JMP_TRUE,
  SWAP_CALL,
  ENTER,
  RET,
  STORE_VAR,
}

export enum OpParameter {
  OPInt,
  OPLabel,
  OPBuiltIn,
  OPString,
}

export type Builtin = {
  name: string;
};

export type Instruction = {
  name: string;
  opcode: InstructionOpCode;
  args: Array<OpParameter>;
};

const builtins = [
  { name: "$$builtin-print" },
  { name: "$$builtin-print-literal" },
  { name: "$$builtin-print-typed" },
  { name: "$$builtin-println" },
  { name: "$$builtin-string-compare" },
  { name: "$$builtin-string-concat" },
  { name: "$$builtin-string-equal" },
  { name: "$$builtin-string-length" },
  { name: "$$builtin-string-substring" },
];

const instructions: Array<Instruction> = [
  {
    name: "PUSH_BUILTIN",
    opcode: InstructionOpCode.PUSH_BUILTIN,
    args: [OpParameter.OPBuiltIn],
  },
  {
    name: "PUSH_CLOSURE",
    opcode: InstructionOpCode.PUSH_CLOSURE,
    args: [OpParameter.OPLabel],
  },
  {
    name: "PUSH_DATA",
    opcode: InstructionOpCode.PUSH_DATA,
    args: [OpParameter.OPLabel, OpParameter.OPInt, OpParameter.OPInt],
  },
  {
    name: "PUSH_DATA_ITEM",
    opcode: InstructionOpCode.PUSH_DATA_ITEM,
    args: [OpParameter.OPInt],
  },
  { name: "PUSH_FALSE", opcode: InstructionOpCode.PUSH_FALSE, args: [] },
  {
    name: "PUSH_INT",
    opcode: InstructionOpCode.PUSH_INT,
    args: [OpParameter.OPInt],
  },
  {
    name: "PUSH_STRING",
    opcode: InstructionOpCode.PUSH_STRING,
    args: [OpParameter.OPString],
  },
  { name: "PUSH_TRUE", opcode: InstructionOpCode.PUSH_TRUE, args: [] },
  {
    name: "PUSH_TUPLE",
    opcode: InstructionOpCode.PUSH_TUPLE,
    args: [OpParameter.OPInt],
  },
  {
    name: "PUSH_TUPLE_ITEM",
    opcode: InstructionOpCode.PUSH_TUPLE_ITEM,
    args: [OpParameter.OPInt],
  },
  { name: "PUSH_UNIT", opcode: InstructionOpCode.PUSH_UNIT, args: [] },
  {
    name: "PUSH_VAR",
    opcode: InstructionOpCode.PUSH_VAR,
    args: [OpParameter.OPInt, OpParameter.OPInt],
  },
  { name: "DUP", opcode: InstructionOpCode.DUP, args: [] },
  { name: "DISCARD", opcode: InstructionOpCode.DISCARD, args: [] },
  { name: "SWAP", opcode: InstructionOpCode.SWAP, args: [] },
  { name: "ADD", opcode: InstructionOpCode.ADD, args: [] },
  { name: "SUB", opcode: InstructionOpCode.SUB, args: [] },
  { name: "MUL", opcode: InstructionOpCode.MUL, args: [] },
  { name: "DIV", opcode: InstructionOpCode.DIV, args: [] },
  { name: "EQ", opcode: InstructionOpCode.EQ, args: [] },
  { name: "JMP", opcode: InstructionOpCode.JMP, args: [OpParameter.OPLabel] },
  { name: "JMP_DATA", opcode: InstructionOpCode.JMP_DATA, args: [] },
  {
    name: "JMP_FALSE",
    opcode: InstructionOpCode.JMP_FALSE,
    args: [OpParameter.OPLabel],
  },
  {
    name: "JMP_TRUE",
    opcode: InstructionOpCode.JMP_TRUE,
    args: [OpParameter.OPLabel],
  },
  { name: "SWAP_CALL", opcode: InstructionOpCode.SWAP_CALL, args: [] },
  { name: "ENTER", opcode: InstructionOpCode.ENTER, args: [OpParameter.OPInt] },
  { name: "RET", opcode: InstructionOpCode.RET, args: [] },
  {
    name: "STORE_VAR",
    opcode: InstructionOpCode.STORE_VAR,
    args: [OpParameter.OPInt],
  },
];

export const findBuiltin = (name: string): Builtin | undefined =>
  builtins.find((b) => b.name === name);

export const find = (opCode: InstructionOpCode): Instruction | undefined =>
  instructions.find((i) => i.opcode === opCode);

export const findOnName = (name: string): Instruction | undefined =>
  instructions.find((i) => i.name === name);
