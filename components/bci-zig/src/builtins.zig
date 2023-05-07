const std = @import("std");

const Machine = @import("machine.zig");

pub fn print(state: *Machine.MemoryState) error{OutOfMemory}!void {
    const v = state.pop();
    _ = state.pop();

    const stdout = state.out;
    stdout.writer().print("{s}", .{v.v.s}) catch {};
}

pub fn println(state: *Machine.MemoryState) error{OutOfMemory}!void {
    _ = state.pop();
    _ = state.pop();

    const stdout = state.out;
    stdout.writer().print("\n", .{}) catch {};
}

pub fn string_length(state: *Machine.MemoryState) error{OutOfMemory}!void {
    const v = state.pop();
    _ = state.pop();

    if (v.v != Machine.ValueValue.s) {
        _ = try state.push_int_value(0);
    }

    _ = try state.push_int_value(@intCast(i32, v.v.s.len));
}

pub fn find(name: []const u8) ?(*const fn (state: *Machine.MemoryState) error{OutOfMemory}!void) {
    if (std.mem.eql(u8, name, "$$builtin-string-length")) {
        return string_length;
    }
    if (std.mem.eql(u8, name, "$$builtin-println")) {
        return println;
    }
    if (std.mem.eql(u8, name, "$$builtin-print")) {
        return print;
    }

    return null;
}
