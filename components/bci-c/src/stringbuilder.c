#include <stdio.h>
#include <string.h>

#include "buffer.h"
#include "memory.h"
#include "settings.h"

#include "stringbuilder.h"

StringBuilder *stringbuilder_new(void)
{
    return buffer_new(1);
}

void stringbuilder_free(StringBuilder *sb) {
    buffer_free(sb);
}

char *stringbuilder_free_use(StringBuilder *sb) {
    stringbuilder_append_char(sb, '\0');
    return buffer_free_use(sb);
}

void stringbuilder_append(StringBuilder *sb, char *s) {
    if (s == NULL) {
        printf("Error: stringbuilder_append called with NULL value\n");
        exit(1);
    }
    buffer_append(sb, s, strlen(s));
}

void stringbuilder_append_char(StringBuilder *sb, char c) {
    buffer_append(sb, &c, 1);
}

void stringbuilder_append_int(StringBuilder *sb, int i) {
    char buffer[15];
    sprintf(buffer, "%d", i);

    if (strlen(buffer) >= 15) {
        printf("Error: buffer overflow in stringbuilder_append_int\n");
        exit(1);
    }

    stringbuilder_append(sb, buffer);
}
