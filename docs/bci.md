The following is a description of a custom bytecode interpreter (BCI) to execute compiled typed lambda calculus with ADTs (TLCA) efficiently. This interpreter has the following characteristics:

- stack based rather than register based - this greatly simplifies the compilation and execution
- each value in BCI is tagged - this greatly simplifies debugging, printing of values and garbage collection
- support for closures - TLCA is a higher-order functional language
- garbage collection is built-in to the BCI

## Instruction Set

The BCI has the following instructions:

| Instruction                | Description                                                                                                                                                                                          |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PUSH_BUILTIN` `n`         | Push a closure value referencing a builtin with the name `n`                                                                                                                                         |
| `PUSH_CLOSURE` `n`         | Push a closure referenced by the offset `n` onto the stack                                                                                                                                           |
| `PUSH_DATA` `l` `n` `m`    | Push a data value with `l` the offset into the block where the meta-data is held, `n` is the constructor number and `m` are the number of values to be pulled of the stack to form the values state. |
| `PUSH_DATA_ITEM` `n`       | Pops a data value off of the top of the stack and pushes the `n`th item in that data value onto the stack                                                                                            |
| `PUSH_FALSE`               | Push `false` onto the stack                                                                                                                                                                          |
| `PUSH_INT` `n`             | Push the literal integer `n` onto the stack                                                                                                                                                          |
| `PUSH_TRUE`                | Push `true` onto the stack                                                                                                                                                                           |
| `PUSH_TUPLE` `n`           | Push a tuple onto the stack using the top `n` values to populate the tuple                                                                                                                           |
| `PUSH_TUPLE_ITEM` `n`      | Pops a tuple off of the top of the stack and pushes the `n`th item in that tuple onto the stack                                                                                                      |
| `PUSH_UNIT`                | Push `()` onto the stack                                                                                                                                                                             |
| `PUSH_VAR` `n` `m`         | Push the variable `n` activation records and `m` offset into the stack onto the stack                                                                                                                |
| `DUP`                      | Duplicate the top of stack                                                                                                                                                                           |
| `ADD`                      | Add two numbers on the stack                                                                                                                                                                         |
| `SUB`                      | Subtract two numbers on the stack                                                                                                                                                                    |
| `MUL`                      | Multiply two numbers on the stack                                                                                                                                                                    |
| `DIV`                      | Divide two numbers on the stack                                                                                                                                                                      |
| `EQ`                       | Compare two numbers on the stack                                                                                                                                                                     |
| `JMP` `n`                  | Jump to the `n` position                                                                                                                                                                             |
| `JMP_DATA` `n` `l1`...`ln` | Pops a data item off of the stack and then, based on the data type, jumps to one of the `n` possible labels                                                                                          |
| `JMP_FALSE` `n`            | Jump to a position if the top of the stack is false                                                                                                                                                  |
| `JMP_TRUE` `n`             | Jump to a position if the top of the stack is true                                                                                                                                                   |
| `SWAP_CALL`                | Call the closure just below the top of the stack removing the closure.                                                                                                                               |
| `ENTER` `n`                | enter a function reserving `n` variable positions                                                                                                                                                    |
| `RET`                      | Return from a function returns the top of stack as a result                                                                                                                                          |
| `STORE_VAR` `n`            | Store the value from the stack into the variable position `n`                                                                                                                                        |

## Binary File Format

A binary file's first 4 bytes is an offset into the file containing raw data.
This purpose of raw data is to hold the meta-data used to display data values
and their types in a readable form. The content from byte 5 up until the start
of raw data is the executable code.

The layout for an ADT's meta-data is:

- first 4 bytes holds the number of constructors,
- next string is the name of the type terminated with a 0 character, and
- the next `n` strings, all terminated with a 0 character, hold the individual
  constructor names.

For example the data definition

```ocaml
data List n =
  | Cons n (List n)
  | Nil
```

will be described as

```
0x2 0x0 0x0 0x0
L i s t 0x0
C o n s 0x0
N i l 0x0
```

## Builtin Closures

The BCI has the following builtin closures:

| Name                    | Signature      | Description                                                                     |
| ----------------------- | -------------- | ------------------------------------------------------------------------------- |
| `$$builtin-print`       | `Any -> Unit`  | Pops the top-of-stack value and prints it to stdout.                            |
| `$$builtin-print-typed` | `Any -> Unit`  | Pops the top-of-stack value and prints it with it's type detail to stdout.      |
| `$$builtin-println`     | `Unit -> Unit` | Pops the top-of-stack value, discards the value and prints a newline to stdout. |
