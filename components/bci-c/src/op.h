#ifndef OP_H
#define OP_H

#include "machine.h"

typedef enum
{
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
  STORE_VAR
} InstructionOpCode;

typedef enum {
    OPInt,
    OPLabel,
    OPBuiltIn,
    OPString
} OpParameter;

typedef struct {
    char *name;
    InstructionOpCode opcode;
    int arity;
    OpParameter *parameters;
} Instruction;

extern void op_initialise(void);
extern void op_finalise(void);

extern Instruction* find(InstructionOpCode opcode);
extern Instruction* findOnName(char *name);
extern Builtin* findBuiltin(char *name);

#endif
