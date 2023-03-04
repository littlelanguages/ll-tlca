#ifndef MINUNIT_H
#define MINUNIT_H

/*
 * Based on: http://www.jera.com/techinfo/jtns/jtn002.html
 */

#define VERBOSE_MINUNIT 1

#define mu_assert(test, message)         \
    do                                   \
    {                                    \
        if (VERBOSE_MINUNIT == 2)        \
            printf("    %s\n", message); \
        if (!(test))                     \
            return message;              \
    } while (0)

#define mu_assert_label(test) mu_assert(test, #test)
#define mu_test_label(test) #test

#define mu_run_test_assert(test, check, message) \
    do                                           \
    {                                            \
        if (VERBOSE_MINUNIT > 0)                 \
            printf("  Test: %s\n", test);        \
        tests_run++;                             \
        mu_assert(check, message);               \
        tests_passed++;                          \
    } while (0)

#define mu_run_test_label_start(label)     \
    do                                     \
    {                                      \
        if (VERBOSE_MINUNIT > 0)           \
            printf("  Test: %s\n", label); \
        tests_run++;                       \
    } while (0)

#define mu_run_test_label_end(label) \
    do                               \
    {                                \
        tests_passed += 1;           \
    } while (0)

#define mu_run_test(test)                                \
    do                                                   \
    {                                                    \
        if (VERBOSE_MINUNIT > 0)                         \
            printf("  Test: %s\n", mu_test_label(test)); \
        char *message = test();                          \
        tests_run++;                                     \
        if (message)                                     \
            return message;                              \
        else                                             \
            tests_passed += 1;                           \
    } while (0)

extern int tests_run;
extern int tests_passed;

#endif /* !MINUNIT_H */
