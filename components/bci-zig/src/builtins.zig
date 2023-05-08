const std = @import("std");

const Machine = @import("machine.zig");

fn print(state: *Machine.MemoryState) error{OutOfMemory}!void {
    const v = state.pop();
    _ = state.pop();

    const s: []u8 = try Machine.to_string(state, v, Machine.StringStyle.Raw);
    defer state.allocator.free(s);

    const stdout = state.out;
    stdout.writer().print("{s}", .{s}) catch {};
}

fn print_literal(state: *Machine.MemoryState) error{OutOfMemory}!void {
    const v = state.pop();
    _ = state.pop();

    const s: []u8 = try Machine.to_string(state, v, Machine.StringStyle.Literal);
    defer state.allocator.free(s);

    const stdout = state.out;
    stdout.writer().print("{s}", .{s}) catch {};
}

fn println(state: *Machine.MemoryState) error{OutOfMemory}!void {
    _ = state.pop();
    _ = state.pop();

    const stdout = state.out;
    stdout.writer().print("\n", .{}) catch {};
}

fn string_compare(state: *Machine.MemoryState) error{OutOfMemory}!void {
    _ = try state.push_builtin_closure_value(state.peek(1), state.peek(0), string_compare_2);
    state.stack.items[state.stack.items.len - 3] = state.stack.items[state.stack.items.len - 1];
    _ = state.pop();
    _ = state.pop();
}

fn string_compare_2(state: *Machine.MemoryState) error{OutOfMemory}!void {
    const v1 = state.pop();
    const v2 = state.pop();

    const i = std.mem.indexOfDiff(u8, v2.v.bc.argument.v.s, v1.v.s);

    if (i == null) {
        _ = try state.push_int_value(0);
    } else if (v2.v.bc.argument.v.s[i.?] < v1.v.s[i.?]) {
        _ = try state.push_int_value(-1);
    } else {
        _ = try state.push_int_value(1);
    }
}

fn string_concat(state: *Machine.MemoryState) error{OutOfMemory}!void {
    _ = try state.push_builtin_closure_value(state.peek(1), state.peek(0), string_concat_2);
    state.stack.items[state.stack.items.len - 3] = state.stack.items[state.stack.items.len - 1];
    _ = state.pop();
    _ = state.pop();
}

fn string_concat_2(state: *Machine.MemoryState) error{OutOfMemory}!void {
    const v1 = state.pop();
    const v2 = state.pop();

    var buffer = std.ArrayList(u8).init(state.allocator);
    defer buffer.deinit();

    try buffer.appendSlice(v2.v.bc.argument.v.s);
    try buffer.appendSlice(v1.v.s);

    _ = try state.push_string_value(buffer.items);
}

fn string_equal(state: *Machine.MemoryState) error{OutOfMemory}!void {
    _ = try state.push_builtin_closure_value(state.peek(1), state.peek(0), string_equal_2);
    state.stack.items[state.stack.items.len - 3] = state.stack.items[state.stack.items.len - 1];
    _ = state.pop();
    _ = state.pop();
}

fn string_equal_2(state: *Machine.MemoryState) error{OutOfMemory}!void {
    const v1 = state.pop();
    const v2 = state.pop();

    _ = try state.push_bool_value(std.mem.eql(u8, v1.v.s, v2.v.bc.argument.v.s));
}

fn string_length(state: *Machine.MemoryState) error{OutOfMemory}!void {
    const v = state.pop();
    _ = state.pop();

    if (v.v != Machine.ValueValue.s) {
        _ = try state.push_int_value(0);
    }

    _ = try state.push_int_value(@intCast(i32, v.v.s.len));
}

fn string_substring(state: *Machine.MemoryState) error{OutOfMemory}!void {
    _ = try state.push_builtin_closure_value(state.peek(1), state.peek(0), string_substring_2);
    state.stack.items[state.stack.items.len - 3] = state.stack.items[state.stack.items.len - 1];
    _ = state.pop();
    _ = state.pop();
}

fn string_substring_2(state: *Machine.MemoryState) error{OutOfMemory}!void {
    _ = try state.push_builtin_closure_value(state.peek(1), state.peek(0), string_substring_3);
    state.stack.items[state.stack.items.len - 3] = state.stack.items[state.stack.items.len - 1];
    _ = state.pop();
    _ = state.pop();
}

fn string_substring_3(state: *Machine.MemoryState) error{OutOfMemory}!void {
    const v1 = state.pop();
    const v2 = state.pop();

    var arg3 = v1.v.n;
    var arg2 = v2.v.bc.argument.v.n;
    const arg1 = v2.v.bc.previous.v.bc.argument.v.s;

    if (arg2 < 0) {
        arg2 = 0;
    }
    if (arg3 < 0) {
        arg3 = 0;
    }

    if (arg2 > arg1.len) {
        _ = try state.push_string_value("");
    } else if (arg3 <= arg2) {
        _ = try state.push_string_value("");
    } else if (arg3 >= arg1.len) {
        _ = try state.push_string_value(arg1[@intCast(usize, arg2)..]);
    } else {
        _ = try state.push_string_value(arg1[@intCast(usize, arg2)..@intCast(usize, arg3)]);
    }
}

pub fn find(name: []const u8) ?(*const fn (state: *Machine.MemoryState) error{OutOfMemory}!void) {
    if (std.mem.eql(u8, name, "$$builtin-println")) {
        return println;
    } else if (std.mem.eql(u8, name, "$$builtin-print")) {
        return print;
    } else if (std.mem.eql(u8, name, "$$builtin-print-literal")) {
        return print_literal;
    } else if (std.mem.eql(u8, name, "$$builtin-string-compare")) {
        return string_compare;
    } else if (std.mem.eql(u8, name, "$$builtin-string-concat")) {
        return string_concat;
    } else if (std.mem.eql(u8, name, "$$builtin-string-equal")) {
        return string_equal;
    } else if (std.mem.eql(u8, name, "$$builtin-string-length")) {
        return string_length;
    } else if (std.mem.eql(u8, name, "$$builtin-string-substring")) {
        return string_substring;
    }

    return null;
}
