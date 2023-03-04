#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include "memory.h"
#include "settings.h"

#include "buffer.h"

Buffer *buffer_new(int item_size)
{
    Buffer *sb = ALLOCATE(Buffer, 1);
    sb->buffer = ALLOCATE(char, BUFFER_TRANCHE * item_size);
    sb->item_size = item_size;
    sb->buffer_count = BUFFER_TRANCHE;
    sb->items_count = 0;

    return sb;
}

void buffer_free(Buffer *sb)
{
    FREE(sb->buffer);
    FREE(sb);
}

void *buffer_free_use(Buffer *sb)
{
    void *buffer = sb->buffer;
    FREE(sb);
    return buffer;
}

void *buffer_content(Buffer *sb)
{
    return sb->buffer;
}

int buffer_count(Buffer *sb)
{
    return sb->items_count;
}

void buffer_append(Buffer *sb, void *v, int count)
{
    if (v == NULL) {
        printf("Error: buffer_append called with NULL value\n");
        exit(1);
    }
    if (count < 0) {
        printf("Error: buffer_append called with negative count\n");
        exit(1);
    }
    if (sb->items_count + count >= sb->buffer_count)
    {
        int new_buffer_size = sb->items_count + count + BUFFER_TRANCHE;
        sb->buffer = REALLOCATE(sb->buffer, char, new_buffer_size * sb->item_size);
        sb->buffer_count = new_buffer_size;
    }

    memcpy(sb->buffer + sb->items_count * sb->item_size, v, count * sb->item_size);
    sb->items_count += count;
}
