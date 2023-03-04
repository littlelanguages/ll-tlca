#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include "machine.h"
#include "memory.h"
#include "settings.h"

#include "op.h"

static void logInstruction(MachineState *state)
{
    printf("%d: ", state->ip);
    Instruction *instruction = find(state->block[state->ip]);
    if (instruction == NULL)
        printf("Unknown opcode: %d", state->block[state->ip]);
    else
    {
        printf("%s", instruction->name);
        if (instruction->arity > 0)
        {
            printf(" ");
            for (int i = 0; i < instruction->arity; i++)
            {
                if (i > 0)
                    printf(" ");
                printf("%d", machine_readIntFrom(state, state->ip + 1 + i * 4));
            }
        }
    }
    printf(": [");

    for (int i = 0; i < state->sp; i++)
    {
        char *value = machine_toString(state->stack[i], VSS_Raw, state);
        printf("%s", value);
        FREE(value);
        if (i < state->sp - 1)
            printf(", ");
    }
    printf("] ");

    char *a = machine_toString(state->activation, VSS_Raw, state);
    printf("%s ", a);
    FREE(a);

    printf("\n");
}

static int32_t readInt(MachineState *state)
{
    int32_t result = machine_readIntFrom(state, state->ip);
    state->ip += 4;
    return result;
}

static char *readString(MachineState *state)
{
    char *result = machine_readStringFrom(state, state->ip);
    state->ip += strlen(result) + 1;
    return result;
}

void execute(unsigned char *block, int debug)
{
    MachineState state = machine_initState(block);

    while (1)
    {
#ifdef MACHINE_FORCE_GC
        forceGC(&state);
#endif

        if (debug)
        {
            logInstruction(&state);
        }
        int opcode = (int)block[state.ip++];

        switch (opcode)
        {
        case PUSH_BUILTIN:
        {
            char *name = readString(&state);
            Builtin *builtin = findBuiltin(name);

            if (builtin == NULL)
            {
                printf("Run: PUSH_BUILTIN: unknown builtin: %s\n", name);
                exit(1);
            }

            machine_newBuiltin(builtin, &state);
            break;
        }
        case PUSH_DATA:
        {
            int32_t meta = readInt(&state);
            int32_t id = readInt(&state);
            int32_t size = readInt(&state);

            Value *v = machine_newData(meta, id, size, state.stack + state.sp - size, &state);

            popN(size + 1, &state);
            push(v, &state);

            break;
        }
        case PUSH_DATA_ITEM:
        {
            int32_t offset = readInt(&state);
            Value *data = pop(&state);
            if (machine_getType(data) != VData)
            {
                printf("Run: PUSH_DATA_ITEM: not a data value\n");
                exit(1);
            }
            if (offset < 0 || offset >= data->data.d.size)
            {
                printf("Run: PUSH_DATA_ITEM: offset out of range: %d\n", offset);
                exit(1);
            }
            push(data->data.d.values[offset], &state);
            break;
        }
        case PUSH_CLOSURE:
        {
            int32_t targetIP = readInt(&state);
            machine_newClosure(state.activation, targetIP, &state);
            break;
        }
        case PUSH_FALSE:
            push(machine_False, &state);
            break;
        case PUSH_INT:
        {
            int32_t value = readInt(&state);
            machine_newInt(value, &state);
            break;
        }
        case PUSH_STRING:
        {
            char *s = readString(&state);
            machine_newString(s, &state);
            break;
        }
        case PUSH_TRUE:
            push(machine_True, &state);
            break;
        case PUSH_TUPLE:
        {
            int32_t size = readInt(&state);

            Value *v = machine_newTuple(size, state.stack + state.sp - size, &state);

            popN(size + 1, &state);
            push(v, &state);

            break;
        }
        case PUSH_TUPLE_ITEM:
        {
            int32_t offset = readInt(&state);
            Value *data = pop(&state);
            if (machine_getType(data) != VTuple)
            {
                printf("Run: PUSH_TUPLE_ITEM: not a tuple value\n");
                exit(1);
            }
            if (offset < 0 || offset >= data->data.t.size)
            {
                printf("Run: PUSH_TUPLE_ITEM: offset out of range: %d\n", offset);
                exit(1);
            }
            push(data->data.t.values[offset], &state);
            break;
        }
        case PUSH_UNIT:
            push(machine_Unit, &state);
            break;
        case PUSH_VAR:
        {
            int32_t index = readInt(&state);
            int32_t offset = readInt(&state);

            Value *a = state.activation;
            while (index > 0)
            {
                if (machine_getType(a) != VActivation)
                {
                    printf("Run: PUSH_VAR: intermediate not an activation record: %d\n", index);
                    exit(1);
                }
                a = a->data.a.closure->data.c.previousActivation;
                index--;
            }
            if (machine_getType(a) != VActivation)
            {
                printf("Run: PUSH_VAR: not an activation record: %d\n", index);
                exit(1);
            }
            if (a->data.a.state == NULL)
            {
                printf("Run: PUSH_VAR: activation has no state\n");
                exit(1);
            }
            if (offset >= a->data.a.stateSize)
            {
                printf("Run: PUSH_VAR: offset out of bounds: %d >= %d\n", offset, a->data.a.stateSize);
                exit(1);
            }
            push(a->data.a.state[offset], &state);

            break;
        }
        case ADD:
        {
            Value *b = pop(&state);
            Value *a = pop(&state);
            if (machine_getType(a) != VInt || machine_getType(b) != VInt)
            {
                printf("Run: ADD: not an int\n");
                exit(1);
            }
            machine_newInt(a->data.i + b->data.i, &state);
            break;
        }
        case SUB:
        {
            Value *b = pop(&state);
            Value *a = pop(&state);
            if (machine_getType(a) != VInt || machine_getType(b) != VInt)
            {
                printf("Run: SUB: not an int\n");
                exit(1);
            }
            machine_newInt(a->data.i - b->data.i, &state);
            break;
        }
        case MUL:
        {
            Value *b = pop(&state);
            Value *a = pop(&state);
            if (machine_getType(a) != VInt || machine_getType(b) != VInt)
            {
                printf("Run: MUL: not an int\n");
                exit(1);
            }
            machine_newInt(a->data.i * b->data.i, &state);
            break;
        }
        case DIV:
        {
            Value *b = pop(&state);
            Value *a = pop(&state);
            if (machine_getType(a) != VInt || machine_getType(b) != VInt)
            {
                printf("Run: DIV: not an int\n");
                exit(1);
            }
            machine_newInt(a->data.i / b->data.i, &state);
            break;
        }
        case EQ:
        {
            Value *b = pop(&state);
            Value *a = pop(&state);
            if (machine_getType(a) != VInt || machine_getType(b) != VInt)
            {
                printf("Run: EQ: not an int\n");
                exit(1);
            }
            push(a->data.i == b->data.i ? machine_True : machine_False, &state);
            break;
        }
        case DUP:
        {
            push(peek(0, &state), &state);
            break;
        }
        case DISCARD:
        {
            pop(&state);
            break;
        }
        case SWAP:
        {
            Value *a = pop(&state);
            Value *b = pop(&state);
            push(a, &state);
            push(b, &state);
            break;
        }
        case JMP:
        {
            int32_t targetIP = readInt(&state);
            state.ip = targetIP;
            break;
        }
        case JMP_DATA:
        {
            int32_t size = readInt(&state);
            Value *v = pop(&state);

            if (machine_getType(v) != VData)
            {
                printf("Run: JMP_DATA: not a data\n");
                exit(1);
            }
            if (v->data.d.id >= size)
            {
                printf("Run: JMP_DATA: id out of bounds: %d >= %d\n", v->data.d.id, size);
                exit(1);
            }

            state.ip = machine_readIntFrom(&state, state.ip + 4 * v->data.d.id);
            break;
        }
        case JMP_FALSE:
        {
            int32_t targetIP = readInt(&state);
            Value *v = pop(&state);
            if (machine_getType(v) != VBool)
            {
                printf("Run: JMP_FALSE: not a bool\n");
                exit(1);
            }
            if (!v->data.b)
                state.ip = targetIP;
            break;
        }
        case JMP_TRUE:
        {
            int32_t targetIP = readInt(&state);
            Value *v = pop(&state);
            if (machine_getType(v) != VBool)
            {
                printf("Run: JMP_TRUE: not a bool\n");
                exit(1);
            }
            if (v->data.b)
                state.ip = targetIP;
            break;
        }
        case SWAP_CALL:
        {
            Value *closure = peek(1, &state);

            if (machine_getType(closure) == VClosure)
            {
                Value *newActivation = machine_newActivation(state.activation, peek(1, &state), state.ip, &state);
                state.ip = peek(2, &state)->data.c.ip;
                state.activation = newActivation;
                state.stack[state.sp - 3] = state.stack[state.sp - 2];
                popN(2, &state);
            }
            else if (machine_getType(closure) == VBuiltin)
            {
                closure->data.bi->function(&state);
            }
            else if (machine_getType(closure) == VBuiltinClosure)
            {
                closure->data.bc.function(&state);
            }
            else
            {
                char *s = machine_toString(closure, VSS_Raw, &state);
                printf("Run: SWAP_CALL: not a closure: %d: %s\n", machine_getType(closure), s);
                FREE(s);
                exit(1);
            }
            break;
        }
        case ENTER:
        {
            int32_t size = readInt(&state);

            if (state.activation->data.a.state == NULL)
            {
                state.activation->data.a.stateSize = size;
                state.activation->data.a.state = ALLOCATE(Value *, size);

                for (int i = 0; i < size; i++)
                    state.activation->data.a.state[i] = NULL;
            }
            else
            {
                printf("Run: ENTER: activation already has state\n");
                exit(1);
            }
            break;
        }
        case RET:
        {
            if (state.activation->data.a.parentActivation == NULL)
            {
                Value *v = pop(&state);

                if (state.sp != 1)
                {
                    printf("run: RET: stack not empty: %d\n", state.sp);
                    exit(1);
                }

                if (machine_getType(v) != VUnit)
                {
                    char *s = machine_toString(v, VSS_Typed, &state);
                    printf("%s\n", s);
                    FREE(s);
                }

                machine_destroyState(&state);

                return;
            }
            state.ip = state.activation->data.a.nextIP;
            state.activation = state.activation->data.a.parentActivation;
            break;
        }
        case STORE_VAR:
        {
            int32_t index = readInt(&state);
            Value *value = pop(&state);

            if (state.activation->data.a.state == NULL)
            {
                printf("Run: STORE_VAR: activation has no state\n");
                exit(1);
            }
            if (index >= state.activation->data.a.stateSize)
            {
                printf("Run: STORE_VAR: index out of bounds: %d\n", index);
                exit(1);
            }

            state.activation->data.a.state[index] = value;
            break;
        }
        default:
        {
            Instruction *instruction = find(opcode);
            if (instruction == NULL)
                printf("Run: Invalid opcode: %d\n", opcode);
            else
                printf("Run: ip=%d: Unknown opcode: %s (%d)\n", state.ip - 1, instruction->name, instruction->opcode);

            exit(1);
        }
        }
    }
}
