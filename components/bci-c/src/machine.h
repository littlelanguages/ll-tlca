#ifndef MACHINE_H
#define MACHINE_H

struct State;

typedef struct {
    char *name;
    void (*function)(struct State *state);
} Builtin;

typedef enum {
    VBlack = 16,
    VWhite = 0
} Colour;

typedef enum {
    VActivation,
    VBool,
    VBuiltin,
    VBuiltinClosure,
    VClosure,
    VData,
    VInt,
    VString,
    VTuple,
    VUnit
} ValueType;

typedef struct Activation {
    struct Value *parentActivation;
    struct Value *closure;
    int nextIP; 
    int stateSize;
    struct Value **state;
} Activation;

typedef struct BuiltinClosure {
    struct Value *previous;
    struct Value *argument;
    void (*function)(struct State *state);
} BuiltinClosure;

typedef struct Closure {
    struct Value *previousActivation;
    int ip;
} Closure;

typedef struct Data {
    int meta;
    int id;
    int size;
    struct Value **values;
} Data;

typedef struct Tuple {
    int size;
    struct Value **values;
} Tuple;

typedef struct Value {
    Colour colour;
    ValueType type;
    union {
        struct Activation a;
        int b;
        Builtin *bi;
        BuiltinClosure bc;
        struct Closure c;
        struct Data d;
        int i;
        struct Tuple t;
        char *s;
    } data;
    struct Value *next;
} Value;

typedef struct State
{
    unsigned char *block;
    int32_t ip;

    Colour colour;

    int size;
    int capacity;

    Value *root;
    Value *activation;

    int32_t sp;
    int32_t stackSize;
    Value **stack;
} MachineState;

struct DataNames {
    int32_t count;
    char **names;
};

extern Value *machine_True;
extern Value *machine_False;
extern Value *machine_Unit;

enum ValueToStringStyle {
    VSS_Raw = 0,
    VSS_Literal = 1,
    VSS_Typed
};

extern char *machine_toString(Value *v, enum ValueToStringStyle style, MachineState *state);

extern void push(Value *value, MachineState *ms);
extern Value *pop(MachineState *ms);
extern void popN(int n, MachineState *ms);
extern Value *peek(int offset, MachineState *ms);

extern void forceGC(MachineState *state);

extern Value *machine_newActivation(Value *parentActivation, Value *closure, int nextIp, MachineState *state);
extern Value *machine_newBool(int b, MachineState *state);
extern Value *machine_newBuiltin(Builtin *builtin, MachineState *state);
extern Value *machine_newBuiltinClosure(Value *previous, Value *argument, void (*function)(MachineState *state), MachineState *state);
extern Value *machine_newClosure(Value *previousActivation, int ip, MachineState *state);
extern Value *machine_newData(int32_t meta, int32_t id, int32_t size, Value **values, MachineState *state);
extern Value *machine_newInt(int i, MachineState *state);
extern Value *machine_newString(char *s, MachineState *state);
extern Value *machine_newString_reference(char *s, MachineState *state);
extern Value *machine_newTuple(int32_t size, Value **values, MachineState *state);

extern void machine_initialise(void);
extern void machine_finalise(void);

#define machine_getType(v) ((ValueType) ((v)->type & 0xf))
#define machine_getColour(v) ((Colour) ((v)->type  & 0x10))

extern MachineState machine_initState(unsigned char *block);
extern void machine_destroyState(MachineState *state);

extern int32_t machine_readIntFrom(MachineState *state, int offset);
extern char *machine_readStringFrom(MachineState *state, int offset);
extern struct DataNames *machine_readDataNamesFrom(MachineState *state, int offset);
extern void machine_freeDataNames(struct DataNames *dataNames);

#endif
