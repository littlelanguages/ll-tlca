# PROFILE CODE
#     clang -O2 -fprofile-instr-generate code.c
#   Run the instrumented executable to get the profile data file
#     ./a.out
#   Combine profiles from multiple runs and format the files by running
#     llvm-profdata merge *.profraw -output=code.profdata
#   Build the code again
#     clang -O2 -fprofile-instr-use=code.profdata code.c
#   Display the profile counters for this file and for any of the specified function(s)
#     llvm-profdata show -all-functions code.profdata

CC=clang -Ofast
# CC=clang -O2 -fprofile-instr-generate
# CC=clang -O2 -fprofile-instr-use=code.profdata

CFLAGS=-pedantic -Ofast
LDFLAGS=

SRC_OBJECTS=src/buffer.o src/dis.o src/machine.o src/memory.o src/op.o src/run.o src/stringbuilder.o
SRC_MAIN_OBJECTS=src/bci.o
SRC_TARGETS=src/bci

TEST_OBJECTS=test/minunit.o test/test-runner.o
TEST_MAIN_OBJECTS=test/test-main.o
TEST_TARGETS=test/test-runner

.PHONY: all clean
all: $(SRC_TARGETS) $(TEST_TARGETS)

./src/bci: $(SRC_OBJECTS) src/bci.o
	$(CC) $(LDFLAGS) -o $@ $^

./test/test-runner: $(SRC_OBJECTS) $(TEST_OBJECTS) test/test-runner.o
	$(CC) $(LDFLAGS) -o $@ $^

%.o: %.c ./src/*.h ./test/*.h
	$(CC) $(CFLAGS) -c $< -o $@

clean:
	rm -f $(SRC_OBJECTS) $(SRC_TARGETS) $(TEST_OBJECTS) $(TEST_TARGETS) $(SRC_MAIN_OBJECTS) $(TEST_MAIN_OBJECTS)
