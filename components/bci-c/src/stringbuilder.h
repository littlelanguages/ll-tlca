#ifndef STRINGBUILDER_H
#define STRINGBUILDER_H

#include "buffer.h"

typedef Buffer StringBuilder;

extern StringBuilder *stringbuilder_new(void);

extern void stringbuilder_free(StringBuilder *sb);
extern char *stringbuilder_free_use(StringBuilder *sb);

extern void stringbuilder_append(StringBuilder *sb, char *s);
extern void stringbuilder_append_char(StringBuilder *sb, char c);
extern void stringbuilder_append_int(StringBuilder *sb, int i);

#endif
