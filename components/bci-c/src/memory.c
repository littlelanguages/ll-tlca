#include <stdio.h>
#include <string.h>

#include "memory.h"

static int32_t memory_allocated_count = 0;

#define DEBUG_MEMORY_MOAT 32

#ifdef MEMORY_DEBUG

#define BLOCK_IN_USE 1
#define BLOCK_FREED 2

struct Block
{
    char *file;
    int32_t line;
    int32_t size;
    void *ptr;
    int inUse;
    struct Block *next;
};

static struct Block *block_list = NULL;

static void setBlockValue(struct Block *block, int absoluteOffset, char value)
{
    if (absoluteOffset < 0)
    {
        printf("setBlockValue: absoluteOffset < 0\n");
        exit(1);
    }
    else if (absoluteOffset >= block->size + DEBUG_MEMORY_MOAT * 2)
    {
        printf("setBlockValue: absoluteOffset >= block->size\n");
        exit(1);
    }

    char *mem = ((char *) block->ptr) - DEBUG_MEMORY_MOAT;
    mem[absoluteOffset] = value;
}

void validate_moat(void)
{
    // printf("memory: validate_moat\n");
    int corrupted = 0;
    for (struct Block *block = block_list; block != NULL; block = block->next)
    {
        int block_corrupted = 0;
        char *mem = block->ptr;
        for (int i = 0; i < DEBUG_MEMORY_MOAT; i++)
        {
            if (*(mem - DEBUG_MEMORY_MOAT + i) != (i % 250) + 1)
            {
                printf("Memory moat corrupted %p from %s:%d\n", (void *)mem, block->file, block->line);
                printf("  original block size: %d\n", block->size);
                printf("  corruption %d bytes before\n", DEBUG_MEMORY_MOAT - i);
                printf("  expected %d, got %d\n", (i % 250) + 1, *(mem - DEBUG_MEMORY_MOAT + i));
                block_corrupted = 1;
            }
            if (mem[block->size + i] != (i % 250) + 1)
            {
                printf("Memory moat corrupted %p from %s:%d\n", (void *)mem, block->file, block->line);
                printf("  original block size: %d\n", block->size);
                printf("  corruption %d bytes after\n", i);
                printf("  expected %d, got %d\n", (i % 250) + 1, mem[block->size + i]);
                block_corrupted = 1;
            }
        }
        if (block_corrupted)
        {
            corrupted = 1;
        }
        else
        {
            // printf("memory: - moat ok for %p from %s:%d\n", block->ptr, block->file, block->line);
        }
    }
    if (corrupted)
    {
        printf("memory: Memory corrupted\n");
        exit(1);
    }
}

#endif

char *memory_alloc(int32_t size, char *file, int32_t line)
{
    memory_allocated_count += 1;
#ifdef MEMORY_DEBUG
    validate_moat();
    char *mem = ((char *)malloc(size + DEBUG_MEMORY_MOAT * 2)) + DEBUG_MEMORY_MOAT;
#else
    char *mem = malloc(size);
#endif

    if (mem == NULL)
    {
        printf("Out of memory %s:%d\n", __FILE__, __LINE__);
        exit(1);
    }

#ifdef MEMORY_DEBUG
    struct Block *block = (struct Block *)malloc(sizeof(struct Block));
    block->file = file;
    block->line = line;
    block->size = size;
    block->ptr = mem;
    block->inUse = BLOCK_IN_USE;
    block->next = block_list;
    block_list = block;
#endif

#ifdef MEMORY_DEBUG
    for (int i = 0; i < DEBUG_MEMORY_MOAT; i++)
    {
        setBlockValue(block, i, (i % 250) + 1);
        setBlockValue(block, i + block->size + DEBUG_MEMORY_MOAT, (i % 250) + 1);
    }
#endif

    // printf("\n++ %p %s:%d >\n", (void *) mem, file, line);

    return mem;
}

void *memory_realloc(void *ptr, int32_t size, char *file, int32_t line)
{
#ifdef MEMORY_DEBUG
    void *new_ptr = memory_alloc(size, file, line);
    memcpy(new_ptr, ptr, size);
    memory_free(ptr, file, line);

    return new_ptr;
#else
    return realloc(ptr, size);
#endif
}

char *memory_strdup(char *string, char *file, int32_t line)
{
#ifdef MEMORY_DEBUG
    validate_moat();

    char *mem = memory_alloc(strlen(string) + 1, file, line);
    strcpy(mem, string);
#else
    memory_allocated_count += 1;
    char *mem = strdup(string);
#endif

    if (mem == NULL)
    {
        printf("Out of memory %s:%d\n", __FILE__, __LINE__);
        exit(1);
    }

    return mem;
}

void memory_free(void *ptr, char *file, int32_t line)
{
    memory_allocated_count -= 1;

#ifdef MEMORY_DEBUG
    validate_moat();

    struct Block *block = block_list;
    while (1)
    {
        if (block == NULL)
        {
            printf("Attempt to free unallocated memory %s:%d\n", file, line);
            exit(1);
        }
        if (block->ptr == ptr)
        {
            if (block->inUse == BLOCK_IN_USE)
            {
                // printf("\n++ %p %s:%d <\n", ptr, block->file, block->line);
                block->inUse = BLOCK_FREED;
                for (int i = 0; i < block->size; i++)
                {
                    setBlockValue(block, i + DEBUG_MEMORY_MOAT, -1);
                }
            }
            else
            {
                printf("Attempt to free memory again %s:%d: Original source: %s:%d\n", file, line, block->file, block->line);
                exit(1);
            }
            break;
        }
        block = block->next;
    }
#endif

#ifndef MEMORY_DEBUG
    (void)realloc(ptr, 0);
#endif
}

#ifdef MEMORY_DEBUG
int32_t memory_allocated(void)
{
    return memory_allocated_count;
}
#endif

void memory_show_heap(void)
{
#ifdef MEMORY_DEBUG
    validate_moat();

    for (struct Block *block = block_list; block != NULL; block = block->next)
    {
        if (block->inUse == BLOCK_IN_USE)
        {
            printf("Memory leak %p of size %d from %s:%d\n", block->ptr, block->size, block->file, block->line);
        }
    }
#endif
}
