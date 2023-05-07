const std = @import("std");

const Builtins = @import("builtins.zig");
const Instructions = @import("instructions.zig");
const Machine = @import("machine.zig");

// Design decisions:
// - The stack is used for calculations and for passing arguments to functions.
// - The activation record is a stack used to keep track of function calls.  Variables are
//   stored in the data secion of the action record.  These variables are made up of
//   parameters and local bindings.
// - A closure points to the address of where execution is to commence when the closure is
//   invoked and to the activation record that describes the environment in which the closure
//   can execute.

fn process_instruction(state: *Machine.MemoryState) !bool {
    const instruction = state.read_u8();

    switch (@intToEnum(Instructions.InstructionOpCode, instruction)) {
        Instructions.InstructionOpCode.PUSH_BUILTIN => {
            const builtin_name: []const u8 = state.read_string();
            const builtin = Builtins.find(builtin_name);

            if (builtin == null) {
                std.log.err("Run: PUSH_BUILTIN: builtin not found: [{s}]\n", .{builtin_name});
                unreachable;
            }

            _ = try state.push_builtin_value(builtin.?);
        },
        Instructions.InstructionOpCode.PUSH_DATA => {
            const meta = state.read_i32();
            const id = state.read_i32();
            const size = state.read_i32();

            _ = try state.push_data_value(@intCast(u32, meta), @intCast(u32, id), @intCast(u32, size));
        },
        Instructions.InstructionOpCode.PUSH_DATA_ITEM => {
            const offset = state.read_i32();
            const d = state.pop();

            if (d.v != Machine.ValueValue.d) {
                std.log.err("Run: PUSH_DATA_ITEM: expected a data value on the stack, got {}\n", .{d});
                unreachable;
            }
            if (offset < 0 or offset >= d.v.d.data.len) {
                std.log.err("Run: PUSH_DATA_ITEM: offset {d} is out of bounds for data value with {d} items\n", .{ offset, d.v.d.data.len });
                unreachable;
            }

            try state.push(d.v.d.data[@intCast(usize, offset)]);
        },
        Instructions.InstructionOpCode.PUSH_FALSE => {
            _ = try state.push_bool_value(false);
        },
        Instructions.InstructionOpCode.PUSH_INT => {
            const value = state.read_i32();
            _ = try state.push_int_value(value);
        },
        Instructions.InstructionOpCode.PUSH_TRUE => {
            _ = try state.push_bool_value(true);
        },
        Instructions.InstructionOpCode.PUSH_TUPLE => {
            var size = state.read_i32();
            _ = try state.push_tuple_value(@intCast(u32, size));
        },
        Instructions.InstructionOpCode.PUSH_UNIT => {
            _ = try state.push_unit_value();
        },
        Instructions.InstructionOpCode.PUSH_VAR => {
            var index = state.read_i32();
            const offset = state.read_i32();

            var a: ?*Machine.Value = state.activation;
            while (index > 0) {
                a = a.?.v.a.closure.?.v.c.previousActivation;
                index -= 1;
            }
            if (a.?.v.a.data == null) {
                std.log.err("Run: PUSH_VAR: activation has not been initialised\n", .{});
                unreachable;
            }
            if (offset >= a.?.v.a.data.?.len) {
                std.log.err("Run: PUSH_VAR: offset {d} is out of bounds for activation with {d} items\n", .{ offset, a.?.v.a.data.?.len });
                unreachable;
            }
            _ = try state.stack.append(a.?.v.a.data.?[@intCast(u32, offset)].?);
        },
        Instructions.InstructionOpCode.PUSH_CLOSURE => {
            var targetIP = state.read_i32();
            _ = try state.push_closure_value(state.activation, @intCast(u32, targetIP));
        },
        Instructions.InstructionOpCode.PUSH_STRING => {
            var s = state.read_string();
            _ = try state.push_string_value(s);
        },
        Instructions.InstructionOpCode.ADD => {
            const b = state.pop();
            const a = state.pop();
            if (a.v != Machine.ValueValue.n or b.v != Machine.ValueValue.n) {
                std.log.err("Run: ADD: expected two integers on the stack, got {} and {}\n", .{ a, b });
                unreachable;
            }
            _ = try state.push_int_value(a.v.n + b.v.n);
        },
        Instructions.InstructionOpCode.SUB => {
            const b = state.pop();
            const a = state.pop();
            if (a.v != Machine.ValueValue.n or b.v != Machine.ValueValue.n) {
                std.log.err("Run: SUB: expected two integers on the stack, got {} and {}\n", .{ a, b });
                unreachable;
            }
            _ = try state.push_int_value(a.v.n - b.v.n);
        },
        Instructions.InstructionOpCode.MUL => {
            const b = state.pop();
            const a = state.pop();
            if (a.v != Machine.ValueValue.n or b.v != Machine.ValueValue.n) {
                std.log.err("Run: MUL: expected two integers on the stack, got {} and {}\n", .{ a, b });
                unreachable;
            }
            _ = try state.push_int_value(a.v.n * b.v.n);
        },
        Instructions.InstructionOpCode.DIV => {
            const b = state.pop();
            const a = state.pop();
            if (a.v != Machine.ValueValue.n or b.v != Machine.ValueValue.n) {
                std.log.err("Run: DIV: expected two integers on the stack, got {} and {}\n", .{ a, b });
                unreachable;
            }
            _ = try state.push_int_value(@divTrunc(a.v.n, b.v.n));
        },
        Instructions.InstructionOpCode.EQ => {
            const b = state.pop();
            const a = state.pop();
            if (a.v != Machine.ValueValue.n or b.v != Machine.ValueValue.n) {
                std.log.err("Run: EQ: expected two integers on the stack, got {} and {}\n", .{ a, b });
                unreachable;
            }
            _ = try state.push_bool_value(a.v.n == b.v.n);
        },
        Instructions.InstructionOpCode.DUP => {
            try state.push(state.peek(0));
        },
        Instructions.InstructionOpCode.DISCARD => {
            _ = state.pop();
        },
        Instructions.InstructionOpCode.JMP => {
            const targetIP = state.read_i32();
            state.ip = @intCast(u32, targetIP);
        },
        Instructions.InstructionOpCode.JMP_DATA => {
            const number_of_items = state.read_i32();
            const v = state.pop();
            if (v.v != Machine.ValueValue.d) {
                std.log.err("Run: JMP_DATA: expected a data value on the stack, got {}\n", .{v});
                unreachable;
            }
            if (v.v.d.id >= number_of_items) {
                std.log.err("Run: JMP_DATA: a constructor id of {d} needs to be less than the {d}\n", .{ v.v.d.id, number_of_items });
                unreachable;
            }

            state.ip = @intCast(u32, Machine.read_i32_from(state.memory, @intCast(u32, state.ip + 4 * v.v.d.id)));
        },
        Instructions.InstructionOpCode.JMP_FALSE => {
            const targetIP = state.read_i32();
            const v = state.pop();
            if (v.v != Machine.ValueValue.b) {
                std.log.err("Run: JMP_FALSE: expected a boolean on the stack, got {}\n", .{v});
                unreachable;
            }
            if (!v.v.b) {
                state.ip = @intCast(u32, targetIP);
            }
        },
        Instructions.InstructionOpCode.JMP_TRUE => {
            const targetIP = state.read_i32();
            const v = state.pop();
            if (v.v != Machine.ValueValue.b) {
                std.log.err("Run: JMP_TRUE: expected a boolean on the stack, got {}\n", .{v});
                unreachable;
            }
            if (v.v.b) {
                state.ip = @intCast(u32, targetIP);
            }
        },
        Instructions.InstructionOpCode.SWAP_CALL => {
            const closure = state.peek(1);

            if (closure.v == Machine.ValueValue.c) {
                const new_activation = try state.push_activation_value(state.activation, state.peek(1), state.ip);
                state.ip = state.peek(2).v.c.ip;
                state.activation = new_activation;

                state.stack.items[state.stack.items.len - 3] = state.stack.items[state.stack.items.len - 2];
                _ = state.pop();
                _ = state.pop();
            } else if (closure.v == Machine.ValueValue.bi) {
                try closure.v.bi(state);
            } else {
                std.log.err("Run: SWAP_CALL: expected a closure on the stack, got {}\n", .{closure});
                unreachable;
            }
        },
        Instructions.InstructionOpCode.ENTER => {
            const num_items = state.read_i32();

            if (state.activation.v.a.data != null) {
                std.log.err("Run: ENTER: activation has already been initialised\n", .{});
                unreachable;
            }
            const s: []?*Machine.Value = try state.allocator.alloc(?*Machine.Value, @intCast(u32, num_items));
            var u: usize = 0;
            while (u < num_items) {
                s[u] = null;
                u += 1;
            }

            state.activation.v.a.data = s;
        },
        Instructions.InstructionOpCode.RET => {
            if (state.activation.v.a.parentActivation == null) {
                const v = state.pop();

                if (v.v != Machine.ValueValue.u) {
                    const s: []u8 = try Machine.to_string(state, v, Machine.StringStyle.Typed);
                    defer state.allocator.free(s);

                    try state.out.writer().print("{s}\n", .{s});
                }

                return true;
            }
            state.ip = state.activation.v.a.nextIP;
            state.activation = state.activation.v.a.parentActivation.?;
        },
        Instructions.InstructionOpCode.STORE_VAR => {
            const index = state.read_i32();

            const v = state.pop();
            if (state.activation.v.a.data == null) {
                std.log.err("Run: STORE_VAR: activation has not been initialised\n", .{});
                unreachable;
            }
            if (index >= state.activation.v.a.data.?.len) {
                std.log.err("Run: STORE_VAR: index {d} is out of bounds for activation with {d} items\n", .{ index, state.activation.v.a.data.?.len });
                unreachable;
            }
            state.activation.v.a.data.?[@intCast(u32, index)] = v;
        },
        else => {
            std.log.err("Unknown instruction: {s}\n", .{Instructions.instructions[instruction].name});
            unreachable;
        },
    }

    return false;
}

pub fn execute(buffer: []const u8, out: std.fs.File) !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    const allocator = gpa.allocator();

    var state = try Machine.init_memory_state(allocator, buffer, out);

    while (true) {
        if (try process_instruction(&state)) {
            state.deinit();

            // _ = gpa.detectLeaks();
            if (gpa.deinit()) {
                std.log.err("Failed to deinit allocator\n", .{});
                std.process.exit(1);
            }
            return;
        }
    }
}

const TestHarness = struct {
    allocator: std.mem.Allocator,
    buffer: []const u8,
    state: Machine.MemoryState,

    pub fn init(buffer: []const u8) !TestHarness {
        const allocator = std.heap.page_allocator;

        return TestHarness{
            .allocator = allocator,
            .buffer = buffer,
            .state = try Machine.init_memory_state(allocator, buffer, std.io.getStdOut()),
        };
    }

    pub fn reset(self: *TestHarness, buffer: []const u8) !void {
        self.state.deinit();
        self.state = try Machine.init_memory_state(self.allocator, buffer, std.io.getStdOut());
    }

    pub fn process_next_instruction(self: *TestHarness) !bool {
        return try process_instruction(&self.state);
    }

    pub fn deinit(self: *TestHarness) void {
        self.state.deinit();
    }
};

const expect = std.testing.expect;
const expectEqual = std.testing.expectEqual;
const expectEqualSlices = std.testing.expectEqualSlices;

test "op DISCARD" {
    var harness = try TestHarness.init(&[_]u8{ 0, 0, 0, 0, @enumToInt(Instructions.InstructionOpCode.DISCARD) });
    defer harness.deinit();

    _ = try harness.state.push_int_value(123);

    const sp = harness.state.stack.items.len;
    try expect(!try harness.process_next_instruction());
    try expectEqual(harness.state.stack.items.len, sp - 1);
}

test "op DUP" {
    var harness = try TestHarness.init(&[_]u8{ 0, 0, 0, 0, @enumToInt(Instructions.InstructionOpCode.DUP) });
    defer harness.deinit();

    _ = try harness.state.push_int_value(123);

    const sp = harness.state.stack.items.len;
    try expect(!try harness.process_next_instruction());
    try expectEqual(harness.state.stack.items.len, sp + 1);

    const v1 = harness.state.pop();
    const v2 = harness.state.pop();

    try expectEqual(v1.v.n, v2.v.n);
}

test "op PUSH_DATA" {
    var harness = try TestHarness.init(&[_]u8{ 0, 0, 0, 0, @enumToInt(Instructions.InstructionOpCode.PUSH_DATA), 1, 0, 0, 0, 2, 0, 0, 0, 3, 0, 0, 0 });
    defer harness.deinit();

    _ = try harness.state.push_int_value(123);
    _ = try harness.state.push_bool_value(true);
    _ = try harness.state.push_bool_value(false);

    try expect(harness.state.stack.items.len == 3);
    try expect(!try harness.process_next_instruction());
    try expectEqual(harness.state.ip, 17);
    try expectEqual(harness.state.stack.items.len, 1);

    const v = harness.state.pop();

    try expectEqual(v.v.d.meta, 1);
    try expectEqual(v.v.d.id, 2);
    try expectEqual(v.v.d.data.len, 3);
    try expectEqual(v.v.d.data[0].v.n, 123);
    try expect(v.v.d.data[1].v.b);
    try expect(!v.v.d.data[2].v.b);
}

test "op PUSH_DATA_ITEM" {
    var harness = try TestHarness.init(&[_]u8{ 0, 0, 0, 0, @enumToInt(Instructions.InstructionOpCode.PUSH_DATA_ITEM), 1, 0, 0, 0 });
    defer harness.deinit();

    _ = try harness.state.push_int_value(123);
    _ = try harness.state.push_bool_value(true);
    _ = try harness.state.push_bool_value(false);
    _ = try harness.state.push_data_value(1, 2, 3);

    try expect(harness.state.stack.items.len == 1);
    try expect(!try harness.process_next_instruction());
    try expectEqual(harness.state.ip, 9);
    try expectEqual(harness.state.stack.items.len, 1);

    const v = harness.state.pop();

    try expect(v.v.b);
}

test "op PUSH_TUPLE" {
    var harness = try TestHarness.init(&[_]u8{ 0, 0, 0, 0, @enumToInt(Instructions.InstructionOpCode.PUSH_TUPLE), 3, 0, 0, 0 });
    defer harness.deinit();

    _ = try harness.state.push_int_value(123);
    _ = try harness.state.push_bool_value(true);
    _ = try harness.state.push_bool_value(false);

    try expect(harness.state.stack.items.len == 3);
    try expect(!try harness.process_next_instruction());
    try expectEqual(harness.state.ip, 9);
    try expectEqual(harness.state.stack.items.len, 1);

    const v = harness.state.pop();

    try expectEqual(v.v.t.len, 3);
    try expectEqual(v.v.t[0].v.n, 123);
    try expect(v.v.t[1].v.b);
    try expect(!v.v.t[2].v.b);
}

test "op JMP_DATA" {
    var harness = try TestHarness.init(&[_]u8{ 0, 0, 0, 0, @enumToInt(Instructions.InstructionOpCode.JMP_DATA), 4, 0, 0, 0, 20, 0, 0, 0, 30, 0, 0, 0, 40, 0, 0, 0, 50, 0, 0, 0 });
    defer harness.deinit();

    _ = try harness.state.push_int_value(123);
    _ = try harness.state.push_bool_value(true);
    _ = try harness.state.push_bool_value(false);
    _ = try harness.state.push_data_value(1, 3, 3);

    try expectEqual(harness.state.stack.items.len, 1);

    try expect(!try harness.process_next_instruction());

    try expectEqual(harness.state.ip, 50);
    try expectEqual(harness.state.stack.items.len, 0);
}

test "op JMP_FALSE" {
    // JMP_FALSE where tos = false
    var harness = try TestHarness.init(&[_]u8{ 0, 0, 0, 0, @enumToInt(Instructions.InstructionOpCode.JMP_FALSE), 100, 0, 0, 0 });
    defer harness.deinit();

    _ = try harness.state.push_bool_value(false);

    try expect(!try harness.process_next_instruction());
    try expectEqual(harness.state.ip, 100);
    try expectEqual(harness.state.stack.items.len, 0);

    // JMP_FALSE where tos = true
    try harness.reset(&[_]u8{ 0, 0, 0, 0, @enumToInt(Instructions.InstructionOpCode.JMP_FALSE), 100, 0, 0, 0 });

    _ = try harness.state.push_bool_value(true);

    try expect(!try harness.process_next_instruction());
    try expectEqual(harness.state.ip, 9);
    try expectEqual(harness.state.stack.items.len, 0);
}

test "op PUSH_BUILTIN $$builtin-println" {
    var harness = try TestHarness.init(&[_]u8{ 0, 0, 0, 0, @enumToInt(Instructions.InstructionOpCode.PUSH_BUILTIN) } ++ "$$builtin-println" ++ &[_]u8{0} ++ &[_]u8{@enumToInt(Instructions.InstructionOpCode.SWAP_CALL)});
    defer harness.deinit();

    try expect(!try harness.process_next_instruction());
    try expectEqual(harness.state.ip, 23);
    try expectEqual(harness.state.stack.items.len, 1);
    _ = try harness.state.push_unit_value();

    try expect(!try harness.process_next_instruction());
    try expectEqual(harness.state.ip, 24);
    try expectEqual(harness.state.stack.items.len, 0);
}

test "op PUSH_BUILTIN $$builtin-string-length" {
    var harness = try TestHarness.init(&[_]u8{ 0, 0, 0, 0, @enumToInt(Instructions.InstructionOpCode.PUSH_BUILTIN) } ++ "$$builtin-string-length" ++ &[_]u8{0} ++ &[_]u8{@enumToInt(Instructions.InstructionOpCode.SWAP_CALL)});
    defer harness.deinit();

    try expect(!try harness.process_next_instruction());
    try expectEqual(harness.state.ip, 29);
    try expectEqual(harness.state.stack.items.len, 1);
    _ = try harness.state.push_string_value("hello");

    try expect(!try harness.process_next_instruction());
    try expectEqual(harness.state.ip, 30);
    try expectEqual(harness.state.stack.items.len, 1);

    const v = harness.state.pop();
    try expectEqual(v.v.n, 5);
}

test "op PUSH_STRING" {
    var harness = try TestHarness.init(&[_]u8{ 0, 0, 0, 0, @enumToInt(Instructions.InstructionOpCode.PUSH_STRING) } ++ "Hello world" ++ &[_]u8{0});
    defer harness.deinit();

    try expect(!try harness.process_next_instruction());
    try expectEqual(harness.state.ip, 17);
    try expectEqual(harness.state.stack.items.len, 1);
    const v = harness.state.pop();
    try expectEqualSlices(u8, v.v.s, "Hello world");
}

test "op PUSH_UNIT" {
    var harness = try TestHarness.init(&[_]u8{ 0, 0, 0, 0, @enumToInt(Instructions.InstructionOpCode.PUSH_UNIT) });
    defer harness.deinit();

    try expect(!try harness.process_next_instruction());
    try expectEqual(harness.state.ip, 5);
    try expectEqual(harness.state.stack.items.len, 1);
    const v = harness.state.pop();
    try expect(v.v == Machine.ValueValue.u);
}
