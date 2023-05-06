const std = @import("std");

const Machine = @import("machine.zig");

pub fn string_length(state: *Machine.MemoryState) error{OutOfMemory}!void {
    const v = state.pop();

    if (v.v != Machine.ValueValue.s) {
        _ = try state.push_int_value(0);
    }

    _ = try state.push_int_value(@intCast(i32, v.v.s.len));
}

pub fn find(name: []const u8) ?(*const fn (state: *Machine.MemoryState) error{OutOfMemory}!void) {
    if (std.mem.eql(u8, name, "$$builtin-string-length")) {
        return string_length;
    }

    return null;
}
