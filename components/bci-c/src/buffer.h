#ifndef BUFFER_H
#define BUFFER_H

#include <stdlib.h>

#include "settings.h"

typedef struct
{
    char *buffer;
    int32_t item_size;
    int32_t buffer_count;
    int32_t items_count;
} Buffer;

extern Buffer *buffer_new(int item_size);
    
extern void buffer_free(Buffer *buffer);
extern void *buffer_free_use(Buffer *buffer);
extern void *buffer_content(Buffer *buffer);
extern int32_t buffer_count(Buffer *buffer);
extern void buffer_append(Buffer *b, void *v, int count);

#endif
