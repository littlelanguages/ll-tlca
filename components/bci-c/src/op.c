#include <stdio.h>
#include <string.h>

#include "memory.h"
#include "settings.h"

#include "op.h"

#define INSTRUCTION_COUNT 29
#define BUILTIN_COUNT 10

Instruction **instructions;
Builtin **builtins;

static void _fatalError(struct State *state)
{
    printf("Fatal error: %s\n", machine_toString(pop(state), VSS_Raw, state));
    exit(1);
}

static void _print(struct State *state)
{
    Value *v = pop(state);
    pop(state);
    char *s = machine_toString(v, VSS_Raw, state);
    printf("%s", s);
    FREE(s);
}

static void _printLiteral(struct State *state)
{
    Value *v = pop(state);
    pop(state);
    char *s = machine_toString(v, VSS_Literal, state);
    printf("%s", s);
    FREE(s);
}

static void _println(struct State *state)
{
    pop(state);
    pop(state);
    printf("\n");
}

static void _stringCompare1(struct State *state)
{
    Value *v1 = pop(state);
    Value *v2 = pop(state);

    machine_newInt(strcmp(v2->data.bc.argument->data.s, v1->data.s), state);
}

static void _stringCompare(struct State *state)
{
    Value *v1 = peek(0, state);

    machine_newBuiltinClosure(peek(1, state), v1, _stringCompare1, state);

    state->stack[state->sp - 3] = state->stack[state->sp - 1];

    popN(2, state);
}

static void _stringConcat1(struct State *state)
{
    Value *v1 = pop(state);
    Value *v2 = pop(state);

    char *s = ALLOCATE(char, strlen(v1->data.s) + strlen(v2->data.bc.argument->data.s) + 1);
    strcpy(s, v2->data.bc.argument->data.s);
    strcat(s, v1->data.s);
    machine_newString_reference(s, state);
}

static void _stringConcat(struct State *state)
{
    Value *v1 = peek(0, state);

    machine_newBuiltinClosure(peek(1, state), v1, _stringConcat1, state);

    state->stack[state->sp - 3] = state->stack[state->sp - 1];

    popN(2, state);
}

static void _stringEqual1(struct State *state)
{
    Value *v1 = pop(state);
    Value *v2 = pop(state);

    if (strcmp(v1->data.s, v2->data.bc.argument->data.s) == 0)
    {
        push(machine_True, state);
    }
    else
    {
        push(machine_False, state);
    }
}

static void _stringEqual(struct State *state)
{
    Value *v1 = peek(0, state);

    machine_newBuiltinClosure(peek(1, state), v1, _stringEqual1, state);

    state->stack[state->sp - 3] = state->stack[state->sp - 1];

    popN(2, state);
}

static void _stringLength(struct State *state)
{
    Value *v = pop(state);
    pop(state);
    machine_newInt(strlen(v->data.s), state);
}

static void _stringSubstring2(struct State *state)
{
    Value *v1 = pop(state);
    Value *v2 = pop(state);

    int32_t arg3 = v1->data.i;
    int32_t arg2 = v2->data.bc.argument->data.i;
    char *arg1 = v2->data.bc.previous->data.bc.argument->data.s;

    if (arg2 < 0)
        arg2 = 0;
    if (arg3 < 0)
        arg3 = 0;

    if (arg2 >= strlen(arg1))
    {
        machine_newString("", state);
    }
    else if (arg3 <= arg2)
    {
        machine_newString("", state);
    }
    else
    {
        if (arg3 > strlen(arg1))
            arg3 = strlen(arg1);

        char *s = ALLOCATE(char, arg3 - arg2 + 1);
        strncpy(s, arg1 + arg2, arg3 - arg2);
        s[arg3 - arg2] = '\0';
        machine_newString_reference(s, state);
    }
}

static void _stringSubstring1(struct State *state)
{
    Value *v1 = peek(0, state);
    Value *v2 = peek(1, state);

    machine_newBuiltinClosure(v2, v1, _stringSubstring2, state);

    state->stack[state->sp - 3] = state->stack[state->sp - 1];
    popN(2, state);
}

static void _stringSubstring(struct State *state)
{
    Value *v1 = peek(0, state);

    machine_newBuiltinClosure(peek(1, state), v1, _stringSubstring1, state);

    state->stack[state->sp - 3] = state->stack[state->sp - 1];

    popN(2, state);
}

static void initInstruction(InstructionOpCode opcode, char *name, int arity, OpParameter *parameters)
{
    if (opcode >= INSTRUCTION_COUNT) {
        printf("Opcode %d is out of range.\n", opcode);
        exit(1);
    }

    Instruction *i = ALLOCATE(Instruction, 1);

    i->opcode = opcode;
    i->name = name;
    i->arity = arity;
    i->parameters = parameters;

    instructions[opcode] = i;
}

static void initBuiltin(int id, char *name, void (*function)(struct State *state))
{
    if (id >= BUILTIN_COUNT) {
        printf("Builtin ID %d is out of range.\n", id);
        exit(1);
    }

    Builtin *b = ALLOCATE(Builtin, 1);

    b->name = name;
    b->function = function;

    builtins[id] = b;
}

void op_initialise(void)
{
    instructions = ALLOCATE(Instruction *, INSTRUCTION_COUNT);

#define init(name, arity, parameters) initInstruction(name, #name, arity, parameters)
    init(PUSH_BUILTIN, 1, (OpParameter[]){OPBuiltIn});
    init(PUSH_CLOSURE, 1, (OpParameter[]){OPLabel});
    init(PUSH_DATA, 3, ((OpParameter[]){OPLabel, OPInt, OPInt}));
    init(PUSH_DATA_ITEM, 1, (OpParameter[]){OPInt});
    init(PUSH_FALSE, 0, NULL);
    init(PUSH_INT, 1, (OpParameter[]){OPInt});
    init(PUSH_STRING, 1, (OpParameter[]){OPString});
    init(PUSH_TRUE, 0, NULL);
    init(PUSH_TUPLE, 1, (OpParameter[]){OPInt});
    init(PUSH_TUPLE_ITEM, 1, (OpParameter[]){OPInt});
    init(PUSH_UNIT, 0, NULL);
    init(PUSH_VAR, 2, ((OpParameter[]){OPInt, OPInt}));
    init(DUP, 0, NULL);
    init(DISCARD, 0, NULL);
    init(SWAP, 0, NULL);
    init(ADD, 0, NULL);
    init(SUB, 0, NULL);
    init(MUL, 0, NULL);
    init(DIV, 0, NULL);
    init(EQ, 0, NULL);
    init(JMP, 1, (OpParameter[]){OPLabel});
    init(JMP_DATA, 0, NULL);
    init(JMP_FALSE, 1, (OpParameter[]){OPLabel});
    init(JMP_TRUE, 1, (OpParameter[]){OPLabel});
    init(SWAP_CALL, 0, NULL);
    init(ENTER, 1, (OpParameter[]){OPInt});
    init(RET, 0, NULL);
    init(STORE_VAR, 1, (OpParameter[]){OPInt});
    instructions[INSTRUCTION_COUNT - 1] = NULL;
#undef init

    builtins = ALLOCATE(Builtin *, BUILTIN_COUNT);
    initBuiltin(0, "$$builtin-print", _print);
    initBuiltin(1, "$$builtin-println", _println);
    initBuiltin(2, "$$builtin-print-literal", _printLiteral);
    initBuiltin(3, "$$builtin-string-compare", _stringCompare);
    initBuiltin(4, "$$builtin-string-concat", _stringConcat);
    initBuiltin(5, "$$builtin-string-equal", _stringEqual);
    initBuiltin(6, "$$builtin-string-length", _stringLength);
    initBuiltin(7, "$$builtin-string-substring", _stringSubstring);
    initBuiltin(8, "$$builtin-fatal-error", _fatalError);
    builtins[BUILTIN_COUNT - 1] = NULL;
}

void op_finalise(void)
{
    Instruction **i = instructions;
    while (*i != NULL)
    {
        FREE(*i);
        i++;
    }

    FREE(instructions);
    instructions = NULL;

    Builtin **b = builtins;
    while (*b != NULL)
    {
        FREE(*b);
        b++;
    }
    FREE(builtins);
    builtins = NULL;
}

Instruction *find(InstructionOpCode opcode)
{
    Instruction **i = instructions;
    while (*i != NULL)
    {
        if ((*i)->opcode == opcode)
        {
            return *i;
        }
        i++;
    }
    return NULL;
}

Instruction *findOnName(char *name)
{
    Instruction **i = instructions;
    while (*i != NULL)
    {
        if (strcmp((*i)->name, name) == 0)
        {
            return *i;
        }
        i++;
    }
    return NULL;
}

Builtin *findBuiltin(char *name)
{
    Builtin **b = builtins;
    while (*b != NULL)
    {
        if (strcmp((*b)->name, name) == 0)
        {
            return *b;
        }
        b++;
    }
    return NULL;
}
