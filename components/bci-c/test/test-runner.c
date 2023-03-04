#include <stdio.h>

#include "../src/memory.h"
#include "minunit.h"

#define TEST_SUITE(name)                  \
    if (result == NULL)                   \
    {                                     \
        char *name(void);                 \
        printf(". Running %s\n", #name);  \
        result = name();                  \
    }                                     \
    else                                  \
    {                                     \
        printf(". Skipping %s\n", #name); \
    }

int main(void)
{
    char *result = NULL;

#ifdef DEBUG_MEMORY
    int start_memory_allocated = memory_allocated();
    printf(". Memory allocated delta: %d\n", start_memory_allocated);
#endif

    if (result == NULL)
    {
        printf(". All tests passed\n");
    }
    else
    {
        printf(". Failed: %s\n", result);
    }

    printf(". Run: %d   Passed: %d   Failed: %d\n", tests_run, tests_passed, (tests_run - tests_passed));

#ifdef DEBUG_MEMORY
    int end_memory_allocated = memory_allocated();
    printf(". Memory allocated delta: %d\n", end_memory_allocated);

    if (end_memory_allocated > start_memory_allocated)
    {
        printf(". Memory leak detected: %d allocations leaked\n", end_memory_allocated - start_memory_allocated);
        return 1;
    }
#endif

    return result != NULL;
}
