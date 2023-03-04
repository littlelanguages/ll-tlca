#include <stdio.h>
#include <string.h>
#include <sys/time.h>

#include "memory.h"
#include "op.h"
#include "settings.h"
#include "stringbuilder.h"

#include "machine.h"

Value *machine_False;
Value *machine_True;
Value *machine_Unit;

// #define MACHINE_FORCE_GC

static MachineState internalMM;

static int activationDepth(Value *v)
{
    if (v == NULL)
    {
        return 0;
    }
    else if (machine_getType(v) == VActivation)
    {
        return 1 + activationDepth(v->data.a.parentActivation);
    }
    else
    {
        return 0;
    }
}

static void append_builtin_closure(Value *v, enum ValueToStringStyle style, MachineState *state, StringBuilder *sb)
{
    if (machine_getType(v->data.bc.previous) == VBuiltin)
    {
        stringbuilder_append(sb, v->data.bc.previous->data.bi->name);
    }
    else
    {
        append_builtin_closure(v->data.bc.previous, style, state, sb);
    }

    stringbuilder_append(sb, " ");

    char *s = machine_toString(v->data.bc.argument, style, state);
    stringbuilder_append(sb, s);
    FREE(s);
}

static void append_value(Value *v, enum ValueToStringStyle style, MachineState *state, StringBuilder *sb)
{
    if (v == NULL)
    {
        stringbuilder_append(sb, "-");
        return;
    }

    switch (machine_getType(v))
    {
    case VActivation:
    {
        stringbuilder_append(sb, "<");
        append_value(v->data.a.parentActivation, style, state, sb);
        stringbuilder_append(sb, ", ");
        append_value(v->data.a.closure, style, state, sb);
        stringbuilder_append(sb, ", ");
        if (v->data.a.nextIP == -1)
            stringbuilder_append(sb, "-");
        else
            stringbuilder_append_int(sb, v->data.a.nextIP);
        stringbuilder_append(sb, ", ");

        if (v->data.a.state == NULL)
        {
            stringbuilder_append(sb, "-");
        }
        else
        {
            stringbuilder_append(sb, "[");
            for (int i = 0; i < v->data.a.stateSize; i++)
            {
                append_value(v->data.a.state[i], style, state, sb);
                if (i < v->data.a.stateSize - 1)
                    stringbuilder_append(sb, ", ");
            }
            stringbuilder_append(sb, "]");
        }
        stringbuilder_append(sb, ">");

        break;
    }
    case VBool:
        stringbuilder_append(sb, v->data.b ? "true" : "false");
        break;
    case VBuiltin:
        stringbuilder_append(sb, v->data.bi->name);
        break;
    case VBuiltinClosure:
        stringbuilder_append(sb, "<");
        append_builtin_closure(v, style, state, sb);
        stringbuilder_append(sb, ">");
        break;
    case VClosure:
        if (style == VSS_Raw)
        {
            stringbuilder_append(sb, "c");
            stringbuilder_append_int(sb, v->data.c.ip);
            stringbuilder_append(sb, "#");
            stringbuilder_append_int(sb, activationDepth(v->data.c.previousActivation));
        }
        else
        {
            stringbuilder_append(sb, "function");
        }
        break;
    case VData:
    {
        struct DataNames *names = machine_readDataNamesFrom(state, v->data.d.meta);

        stringbuilder_append(sb, names->names[v->data.d.id + 1]);
        for (int i = 0; i < v->data.d.size; i++)
        {
            stringbuilder_append(sb, " ");
            if (machine_getType(v->data.d.values[i]) == VData && v->data.d.values[i]->data.d.size > 0)
            {
                stringbuilder_append(sb, "(");
                append_value(v->data.d.values[i], style, state, sb);
                stringbuilder_append(sb, ")");
            }
            else
            {
                append_value(v->data.d.values[i], style, state, sb);
            }
        }

        machine_freeDataNames(names);
        break;
    }
    case VInt:
        stringbuilder_append_int(sb, v->data.i);
        break;
    case VString:
        if (style == VSS_Raw)
        {
            stringbuilder_append(sb, v->data.s);
        }
        else
        {
            stringbuilder_append(sb, "\"");
            char *runner = v->data.s;
            while (*runner != '\0')
            {
                if (*runner == '"' || *runner == '\\')
                {
                    stringbuilder_append_char(sb, '\\');
                }
                stringbuilder_append_char(sb, *runner);
                runner++;
            }
            stringbuilder_append(sb, "\"");
        }
        break;
    case VTuple:
        stringbuilder_append(sb, "(");
        for (int i = 0; i < v->data.t.size; i++)
        {
            append_value(v->data.t.values[i], style, state, sb);
            if (i < v->data.t.size - 1)
                stringbuilder_append(sb, ", ");
        }
        stringbuilder_append(sb, ")");
        break;
    case VUnit:
        stringbuilder_append(sb, "()");
        break;
    default:
    {
        stringbuilder_append(sb, "Unknown value - ");
        stringbuilder_append_int(sb, machine_getType(v));
        stringbuilder_append(sb, " (");
        stringbuilder_append_int(sb, v->type);
        stringbuilder_append(sb, ")");
    }
    }
}

static void append_type(Value *v, enum ValueToStringStyle style, MachineState *state, StringBuilder *sb)
{
    if (v != NULL)
    {
        switch (machine_getType(v))
        {
        case VActivation:
        {
            stringbuilder_append(sb, "Activation");
            break;
        }
        case VBool:
            stringbuilder_append(sb, "Bool");
            break;
        case VBuiltin:
            stringbuilder_append(sb, "Builtin");
            break;
        case VBuiltinClosure:
            stringbuilder_append(sb, "BuiltinClosure");
            break;
        case VClosure:
        {
            stringbuilder_append(sb, "Closure");
            break;
        }
        case VData:
        {
            struct DataNames *names = machine_readDataNamesFrom(state, v->data.d.meta);
            stringbuilder_append(sb, names->names[0]);
            machine_freeDataNames(names);
            break;
        }
        case VInt:
            stringbuilder_append(sb, "Int");
            break;
        case VString:
            stringbuilder_append(sb, "String");
            break;
        case VTuple:
        {
            stringbuilder_append(sb, "(");
            for (int i = 0; i < v->data.t.size; i++)
            {
                append_type(v->data.t.values[i], style, state, sb);
                if (i < v->data.t.size - 1)
                    stringbuilder_append(sb, " * ");
            }
            stringbuilder_append(sb, ")");
            break;
        }
        case VUnit:
            stringbuilder_append(sb, "Unit");
            break;
        default:
        {
            stringbuilder_append(sb, "Unknown value - ");
            stringbuilder_append_int(sb, machine_getType(v));
            stringbuilder_append(sb, " (");
            stringbuilder_append_int(sb, v->type);
            stringbuilder_append(sb, ")");
        }
        }
    }
}

char *machine_toString(Value *v, enum ValueToStringStyle style, MachineState *state)
{
    StringBuilder *sb = stringbuilder_new();
    append_value(v, style, state, sb);
    if (style == VSS_Typed)
    {
        stringbuilder_append(sb, ": ");
        append_type(v, style, state, sb);
    }
    return stringbuilder_free_use(sb);
}

void push(Value *value, MachineState *mm)
{
    if (mm->sp == mm->stackSize)
    {
        mm->stackSize *= 2;
        mm->stack = REALLOCATE(mm->stack, Value *, mm->stackSize);

        for (int i = mm->sp; i < mm->stackSize; i++)
            mm->stack[i] = NULL;
    }

    mm->stack[mm->sp++] = value;
}

Value *pop(MachineState *mm)
{
    if (mm->sp == 0)
    {
        printf("Run: pop: stack is empty\n");
        exit(1);
    }

    Value *result = mm->stack[--mm->sp];
    mm->stack[mm->sp] = NULL;
    return result;
}

void popN(int n, MachineState *mm)
{
    if (mm->sp < n)
    {
        printf("Run: popN: stack is too small\n");
        exit(1);
    }

    mm->sp -= n;

    for (int i = mm->sp; i < mm->sp + n; i++)
        mm->stack[i] = NULL;
}

Value *peek(int offset, MachineState *mm)
{
    if (mm->sp <= offset)
    {
        printf("Run: peek: stack is too small\n");
        exit(1);
    }

    return mm->stack[mm->sp - 1 - offset];
}

long long timeInMilliseconds(void)
{
    struct timeval tv;

    gettimeofday(&tv, NULL);
    return (((long long)tv.tv_sec) * 1000) + (tv.tv_usec / 1000);
}

static void mark(Value *v, Colour colour, MachineState *state)
{
    if (v == NULL)
        return;

    if (machine_getColour(v) == colour)
        return;

#ifdef MACHINE_DEBUG_GC
    ValueType oldValueType = machine_getType(v);
    Colour oldColour = machine_getColour(v);
#endif

    v->type = (machine_getType(v) & 0xf) | colour;

#ifdef MACHINE_DEBUG_GC
    if (oldValueType != machine_getType(v))
    {
        printf("gc: mark: type changed.\n");
        exit(1);
    }
    else if (oldColour == machine_getColour(v))
    {
        printf("gc: mark: colour did not change.\n");
        exit(1);
    }
#endif

#ifdef MACHINE_DEBUG_GC
    char *s = machine_toString(v, VSS_Raw, state);
    printf("gc: marking %s\n", s);
    FREE(s);
#endif

    int t = machine_getType(v);
    switch (t)
    {
    case VActivation:
        mark(v->data.a.parentActivation, colour, state);
        mark(v->data.a.closure, colour, state);
        if (v->data.a.state != NULL)
        {
            for (int i = 0; i < v->data.a.stateSize; i++)
                mark(v->data.a.state[i], colour, state);
        }
        break;
    case VData:
        for (int i = 0; i < v->data.d.size; i++)
            mark(v->data.d.values[i], colour, state);
        break;
    case VTuple:
        for (int i = 0; i < v->data.t.size; i++)
            mark(v->data.t.values[i], colour, state);
        break;
    case VClosure:
        mark(v->data.c.previousActivation, colour, state);
        break;
    case VBuiltinClosure:
        mark(v->data.bc.previous, colour, state);
        mark(v->data.bc.argument, colour, state);
        break;
    default:
    {
        if (t != VInt && t != VBool && t != VString && t != VUnit && t != VBuiltin)
        {
            printf("gc: mark: unknown value type %d\n", t);
            exit(1);
        }
    }
    }
}

static void sweep(MachineState *mm)
{
    Value *v;
#ifdef MACHINE_DEBUG_GC
    v = mm->root;
    while (v != NULL)
    {
        Value *nextV = v->next;
        if (machine_getColour(v) != mm->colour)
        {
            char *s = machine_toString(v, VSS_Raw, mm);
            printf("gc: releasing %s (%p)\n", s, (void *)v);
            FREE(s);
        }
        v = nextV;
    }
#endif

    Value *newRoot = NULL;
    int newSize = 0;

    v = mm->root;
    while (v != NULL)
    {
        Value *nextV = v->next;
        if (machine_getColour(v) == mm->colour)
        {
            v->next = newRoot;
            newRoot = v;
            newSize++;
        }
        else
        {
            switch (machine_getType(v))
            {
            case VInt:
            case VBool:
            case VBuiltin:
            case VBuiltinClosure:
            case VUnit:
#ifdef MACHINE_DEBUG_GC
                v->data.i = -1;
#endif
                break;

            case VString:
                FREE(v->data.s);
#ifdef MACHINE_DEBUG_GC
                v->data.s = NULL;
#endif
                break;
            case VTuple:
                FREE(v->data.t.values);
                break;
            case VData:
                FREE(v->data.d.values);
                break;
            case VClosure:
#ifdef MACHINE_DEBUG_GC
                v->data.c.ip = -1;
                v->data.c.previousActivation = NULL;
#endif
                break;
            case VActivation:
                if (v->data.a.state != NULL)
                {
                    FREE(v->data.a.state);
                }
#ifdef MACHINE_DEBUG_GC
                v->data.a.parentActivation = NULL;
                v->data.a.closure = NULL;
                v->data.a.nextIP = -1;
                v->data.a.stateSize = -1;
                v->data.a.state = NULL;
#endif
                break;
            }
            v->type = 0;

            FREE(v);
        }
        v = nextV;
    }

#ifdef MACHINE_TIME_GC
    printf("gc: collected %d objects, %d remaining\n", mm->size - newSize, newSize);
#endif

    mm->root = newRoot;
    mm->size = newSize;

#ifdef MACHINE_DEBUG_GC
    v = mm->root;
    while (v != NULL)
    {
        Value *nextV = v->next;
        char *s = machine_toString(v, VSS_Raw, mm);
        printf("gc: --- %s\n", s);
        FREE(s);
        v = nextV;
    }
#endif
}

void forceGC(MachineState *mm)
{
#ifdef MACHINE_DEBUG_GC
    printf("gc: forcing garbage collection ------------------------------\n");
#endif

#ifdef MACHINE_TIME_GC
    long long start = timeInMilliseconds();
#endif

    Colour newColour = (mm->colour == VWhite) ? VBlack : VWhite;

    if (mm->activation != NULL)
    {
        mark(mm->activation, newColour, mm);
    }
    for (int i = 0; i < mm->sp; i++)
    {
        mark(mm->stack[i], newColour, mm);
    }

    mm->colour = newColour;

#ifdef MACHINE_TIME_GC
    long long endMark = timeInMilliseconds();
#endif
#ifdef MACHINE_DEBUG_GC
    printf("gc: sweeping\n");
#endif
    sweep(mm);

#ifdef MACHINE_TIME_GC
    long long endSweep = timeInMilliseconds();

    printf("gc: mark took %lldms, sweep took %lldms\n", endMark - start, endSweep - endMark);
#endif
}

static void expandHeap(MachineState *state)
{
    if (state->size >= ((int)(state->capacity * MACHINE_HEAP_GROWTH_THRESHOLD)))
    {
        state->capacity = (int)(state->capacity * MACHINE_HEAP_GROWTH_FACTOR);
        
#if defined(MACHINE_DEBUG_GC) || defined(MACHINE_TIME_GC)
        printf("gc: memory still full after gc... increasing heap capacity to %d\n", state->capacity);
#endif
    }
}

static void gc(MachineState *state)
{
#ifdef MACHINE_FORCE_GC
    forceGC(state);
    expandHeap(state);
#else
    if (state->size >= state->capacity)
    {
        forceGC(state);
        expandHeap(state);
    }
#endif
}

static void attachValue(Value *v, MachineState *mm)
{
    mm->size++;
    v->next = mm->root;
    mm->root = v;
}

Value *machine_newActivation(Value *parentActivation, Value *closure, int nextIp, MachineState *state)
{
    gc(state);

    if (parentActivation != NULL && machine_getType(parentActivation) != VActivation)
    {
        printf("Error: machine_newActivation: parentActivation is not an activation: %s\n", machine_toString(parentActivation, VSS_Raw, state));
        exit(1);
    }
    if (closure != NULL && machine_getType(closure) != VClosure)
    {
        printf("Error: machine_newActivation: closure is not a closure: %s\n", machine_toString(closure, VSS_Raw, state));
        exit(1);
    }

    Value *v = ALLOCATE(Value, 1);

    v->type = VActivation | state->colour;
    v->data.a.parentActivation = parentActivation;
    v->data.a.closure = closure;
    v->data.a.nextIP = nextIp;
    v->data.a.stateSize = -1;
    v->data.a.state = NULL;

    attachValue(v, state);

    push(v, state);

    return v;
}

Value *machine_newBool(int b, MachineState *state)
{
    gc(state);

    Value *v = ALLOCATE(Value, 1);

    v->type = VBool | state->colour;
    v->data.b = b;
    attachValue(v, state);

    push(v, state);

    return v;
}

Value *machine_newBuiltin(Builtin *builtin, MachineState *state)
{
    gc(state);

    Value *v = ALLOCATE(Value, 1);

    v->type = VBuiltin | state->colour;
    v->data.bi = builtin;
    attachValue(v, state);

    push(v, state);

    return v;
}

Value *machine_newBuiltinClosure(Value *previous, Value *argument, void (*function)(MachineState *state), MachineState *state)
{
    gc(state);

    Value *v = ALLOCATE(Value, 1);

    v->type = VBuiltinClosure | state->colour;
    v->data.bc.previous = previous;
    v->data.bc.argument = argument;
    v->data.bc.function = function;
    attachValue(v, state);

    push(v, state);

    return v;
}

Value *machine_newClosure(Value *previousActivation, int ip, MachineState *state)
{
    gc(state);

    if (previousActivation != NULL && machine_getType(previousActivation) != VActivation)
    {
        printf("Error: machine_newClosure: previousActivation is not an activation: %s\n", machine_toString(previousActivation, VSS_Raw, state));
        exit(1);
    }

    Value *v = ALLOCATE(Value, 1);

    v->type = VClosure | state->colour;
    v->data.c.previousActivation = previousActivation;
    v->data.c.ip = ip;
    attachValue(v, state);

    push(v, state);

    return v;
}

Value *machine_newData(int32_t meta, int32_t id, int32_t size, Value **values, MachineState *state)
{
    gc(state);

    Value *v = ALLOCATE(Value, 1);

    v->type = VData | state->colour;
    v->data.d.meta = meta;
    v->data.d.id = id;
    v->data.d.size = size;
    v->data.d.values = ALLOCATE(Value *, size);
    for (int i = 0; i < size; i++)
    {
        v->data.d.values[i] = values[i];
    }

    attachValue(v, state);

    push(v, state);

    return v;
}

Value *machine_newInt(int i, MachineState *state)
{
    gc(state);

    Value *v = ALLOCATE(Value, 1);
    v->type = VInt | state->colour;
    v->data.i = i;

    push(v, state);

    attachValue(v, state);

    return v;
}

Value *machine_newString_reference(char *s, MachineState *state)
{
    gc(state);

    Value *v = ALLOCATE(Value, 1);
    v->type = VString | state->colour;
    v->data.s = s;

    attachValue(v, state);

    push(v, state);

    return v;
}

Value *machine_newString(char *s, MachineState *state)
{
    char *newS = STRDUP(s);
    return machine_newString_reference(newS, state);
}

Value *machine_newTuple(int32_t size, Value **values, MachineState *state)
{
    gc(state);

    Value *v = ALLOCATE(Value, 1);

    v->type = VTuple | state->colour;
    v->data.t.size = size;
    v->data.t.values = ALLOCATE(Value *, size);
    for (int i = 0; i < size; i++)
    {
        v->data.t.values[i] = values[i];
    }

    attachValue(v, state);

    push(v, state);

    return v;
}

static Value *machine_newUnit(MachineState *state)
{
    gc(state);

    Value *v = ALLOCATE(Value, 1);

    v->type = VUnit | state->colour;
    attachValue(v, state);

    push(v, state);

    return v;
}

void machine_initialise(void)
{
    internalMM = machine_initState(NULL);

    machine_False = machine_newBool(0, &internalMM);
    machine_True = machine_newBool(1, &internalMM);
    machine_Unit = machine_newUnit(&internalMM);
}

void machine_finalise(void)
{
#ifdef MACHINE_DEBUG_GC
    printf("gc: machine_finalise\n");
#endif
    machine_destroyState(&internalMM);

    machine_False = NULL;
    machine_True = NULL;
    machine_Unit = NULL;
}

MachineState machine_initState(unsigned char *block)
{
    MachineState state;

    state.block = block;
    state.ip = 4;
    state.colour = VWhite;

    state.size = 0;
    state.capacity = MACHINE_INITIAL_HEAP_SIZE;

    state.root = NULL;
    state.activation = NULL;

    state.sp = 0;
    state.stackSize = MACHINE_INITIAL_STACK_SIZE;
    state.stack = ALLOCATE(Value *, MACHINE_INITIAL_STACK_SIZE);

    for (int i = 0; i < MACHINE_INITIAL_STACK_SIZE; i++)
        state.stack[i] = NULL;

    state.activation = machine_newActivation(NULL, NULL, -1, &state);

    return state;
}

void machine_destroyState(MachineState *state)
{
    state->stackSize = 0;
    state->sp = 0;
    state->activation = NULL;

    forceGC(state);
    forceGC(state);

    FREE(state->stack);
    if (state->block != NULL)
        FREE(state->block);
    state->block = NULL;
}

int32_t machine_readIntFrom(MachineState *state, int offset)
{
    unsigned char *block = state->block;

    int32_t size = (int32_t)(block[offset] |
                             ((block[offset + 1]) << 8) |
                             ((block[offset + 2]) << 16) |
                             ((block[offset + 3]) << 24));

    return size;
}

char *machine_readStringFrom(MachineState *state, int offset)
{
    return (char *)state->block + offset;
}

struct DataNames *machine_readDataNamesFrom(MachineState *state, int offset)
{
    struct DataNames *dataNames = ALLOCATE(struct DataNames, 1);
    dataNames->count = machine_readIntFrom(state, offset) + 1;
    offset += 4;
    dataNames->names = ALLOCATE(char *, dataNames->count);
    for (int i = 0; i < dataNames->count; i++)
    {
        dataNames->names[i] = machine_readStringFrom(state, offset);
        offset += strlen(dataNames->names[i]) + 1;
    }
    return dataNames;
}

void machine_freeDataNames(struct DataNames *dataNames)
{
    FREE(dataNames->names);
    FREE(dataNames);
}
