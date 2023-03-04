#include <stdio.h>
#include <stdlib.h>

#include "op.h"

static int32_t readIntFrom(unsigned char *block, int *offset)
{
    int32_t size = (int32_t)(block[*offset] |
                             ((block[*offset + 1]) << 8) |
                             ((block[*offset + 2]) << 16) |
                             ((block[*offset + 3]) << 24));

    *offset += 4;

    return size;
}

void dis(unsigned char *code, int codeLength)
{
    int i = 4;
    while (i < codeLength)
    {
        printf("% 6d: ", i);

        unsigned char opcode = code[i++];

        Instruction *instruction = find(opcode);
        if (instruction == NULL)
        {
            printf("Unknown opcode: %d\n", (int)opcode);
            exit(1);
        }
        printf("%s", instruction->name);
        for (int j = 0; j < instruction->arity; j++)
        {
            int operand = readIntFrom(code, &i);
            printf(" %d", operand);
        }
        printf("\n");
    }
}
