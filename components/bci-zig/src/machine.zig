const std = @import("std");

const Colour = enum(u2) {
    Black = 0,
    White = 1,
};

pub const Value = struct {
    colour: Colour,
    next: ?*Value,

    v: ValueValue,

    pub fn activation_depth(self: *Value) !u32 {
        switch (self.v) {
            .n, .b, .bi, .bc, .d, .s => return 0,
            .c => return 1,
            .a => return 1 + if (self.v.a.parentActivation == null) 0 else try self.v.a.parentActivation.?.activation_depth(),
        }
    }

    pub fn deinit(self: *Value, allocator: std.mem.Allocator) void {
        switch (self.v) {
            .b, .bi, .bc, .c, .n => {},
            .s => {
                allocator.free(self.v.s);
            },
            .d => {
                allocator.free(self.v.d.data);
            },
            .a => {
                if (self.v.a.data != null) {
                    allocator.free(self.v.a.data.?);
                    self.v.a.data = null;
                }
            },
        }
    }
};

pub const ValueValue = union(enum) {
    a: Activation,
    b: bool,
    bi: Builtin,
    bc: BuiltinClosure,
    c: Closure,
    d: Data,
    n: i32,
    s: []const u8,
};

const Builtin = struct {
    name: *[]const u8,
    fun: *const fn (*MemoryState) error{OutOfMemory}!void,
};

const BuiltinClosure = struct {
    previous: *Value,
    argument: *Value,
    fun: *const fn (*MemoryState) error{OutOfMemory}!void,
};

const Closure = struct {
    previousActivation: ?*Value,
    ip: u32,
};

const Data = struct {
    meta: u32,
    id: u32,
    data: []*Value,
};

const Activation = struct {
    parentActivation: ?*Value,
    closure: ?*Value,
    nextIP: u32,
    data: ?[]?*Value,
};

pub const MemoryState = struct {
    allocator: std.mem.Allocator,
    ip: u32,
    memory: []const u8,
    stack: std.ArrayList(*Value),
    activation: *Value,
    colour: Colour,
    root: ?*Value,
    memory_size: u32,
    memory_capacity: u32,

    fn push_value(self: *MemoryState, vv: ValueValue) error{OutOfMemory}!*Value {
        const v = try self.allocator.create(Value);
        self.memory_size += 1;

        v.colour = self.colour;
        v.v = vv;
        v.next = self.root;

        self.root = v;

        try self.stack.append(v);

        gc(self);

        return v;
    }

    pub fn push_activation_value(self: *MemoryState, parentActivation: ?*Value, closure: ?*Value, nextIP: u32) error{OutOfMemory}!*Value {
        return try self.push_value(ValueValue{ .a = Activation{ .parentActivation = parentActivation, .closure = closure, .nextIP = nextIP, .data = null } });
    }

    pub fn push_bool_value(self: *MemoryState, b: bool) error{OutOfMemory}!*Value {
        return try self.push_value(ValueValue{ .b = b });
    }

    pub fn push_closure_value(self: *MemoryState, parentActivation: ?*Value, targetIP: u32) error{OutOfMemory}!*Value {
        return try self.push_value(ValueValue{ .c = Closure{ .previousActivation = parentActivation, .ip = targetIP } });
    }

    pub fn push_data_value(self: *MemoryState, meta: u32, id: u32, size: u32) error{OutOfMemory}!*Value {
        const data = try self.allocator.alloc(*Value, size);

        var i: u32 = 0;
        while (i < size) {
            data[size - i - 1] = self.pop();
            i += 1;
        }

        return try self.push_value(ValueValue{ .d = Data{ .meta = meta, .id = id, .data = data } });
    }

    pub fn push_int_value(self: *MemoryState, i: i32) error{OutOfMemory}!*Value {
        return try self.push_value(ValueValue{ .n = i });
    }

    pub fn push_string_value(self: *MemoryState, s: []const u8) error{OutOfMemory}!*Value {
        const newS = try self.allocator.alloc(u8, s.len);
        std.mem.copy(u8, newS, s);
        return try self.push_value(ValueValue{ .s = newS });
    }

    pub fn pop(self: *MemoryState) *Value {
        return self.stack.pop();
    }

    pub fn push(self: *MemoryState, v: *Value) error{OutOfMemory}!void {
        try self.stack.append(v);
    }

    pub fn peek(self: *MemoryState, n: u32) *Value {
        return self.stack.items[self.stack.items.len - n - 1];
    }

    pub fn read_u8(self: *MemoryState) u8 {
        const value = self.memory[self.ip];
        self.ip += 1;
        return value;
    }

    pub fn read_i32(self: *MemoryState) i32 {
        const value = read_i32_from(self.memory, self.ip);
        self.ip += 4;
        return value;
    }

    pub fn read_string(self: *MemoryState) []const u8 {
        const start_index = self.ip;
        while (self.memory[self.ip] != 0) {
            self.ip += 1;
        }

        const value = self.memory[start_index..self.ip];
        self.ip += 1;

        return value;
    }

    pub fn deinit(self: *MemoryState) void {
        // // Leave this code in - helpful to use when debugging memory leaks.
        // // The code following this comment block just nukes the allocated
        // // memory without consideration what is still in use.
        //
        // var count: u32 = 0;
        // for (self.stack.items) |v| {
        //     count += 1;
        //     _ = v;
        // }
        // if (self.activation.v.a.data != null) {
        //     self.allocator.free(self.activation.v.a.data.?);
        //     self.activation.v.a.data = null;
        // }
        // force_gc(self);
        // var number_of_values: u32 = 0;
        // {
        //     var runner: ?*Value = self.root;
        //     while (runner != null) {
        //         const next = runner.?.next;
        //         number_of_values += 1;
        //         runner = next;
        //     }
        // }
        // std.log.info("gc: memory state stack length: {d} vs {d}: values: {d} vs {d}", .{ self.stack.items.len, count, self.memory_size, number_of_values });
        // self.stack.deinit();
        // self.stack = std.ArrayList(*Value).init(self.allocator);
        // self.activation = &Value{ .colour = self.colour, .next = null, .v = ValueValue{ .n = 0 } };
        // self.stack.deinit();

        self.stack.deinit();
        var runner: ?*Value = self.root;
        while (runner != null) {
            const next = runner.?.next;
            runner.?.deinit(self.allocator);
            self.allocator.destroy(runner.?);
            runner = next;
        }
    }
};

fn mark(state: *MemoryState, possible_value: ?*Value, colour: Colour) void {
    if (possible_value == null) {
        return;
    }

    const v = possible_value.?;

    if (v.colour == colour) {
        return;
    }

    v.colour = colour;

    switch (v.v) {
        .b, .bi, .n, .s => {},
        .bc => {
            mark(state, v.v.bc.previous, colour);
            mark(state, v.v.bc.argument, colour);
        },
        .c => {
            mark(state, v.v.c.previousActivation, colour);
        },
        .d => {
            for (v.v.d.data) |data| {
                mark(state, data, colour);
            }
        },
        .a => {
            mark(state, v.v.a.parentActivation, colour);
            mark(state, v.v.a.closure, colour);
            if (v.v.a.data != null) {
                for (v.v.a.data.?) |data| {
                    mark(state, data, colour);
                }
            }
        },
    }
}

fn sweep(state: *MemoryState, colour: Colour) void {
    var runner: *?*Value = &state.root;
    while (runner.* != null) {
        if (runner.*.?.colour != colour) {
            const next = runner.*.?.next;
            runner.*.?.deinit(state.allocator);
            state.allocator.destroy(runner.*.?);
            state.memory_size -= 1;
            runner.* = next;
        } else {
            runner = &(runner.*.?.next);
        }
    }
}

fn force_gc(state: *MemoryState) void {
    const new_colour = if (state.colour == Colour.Black) Colour.White else Colour.Black;

    mark(state, state.activation, new_colour);
    for (state.stack.items) |value| {
        mark(state, value, new_colour);
    }

    sweep(state, new_colour);

    state.colour = new_colour;
}

fn gc(state: *MemoryState) void {
    const threshold_rate = 0.75;

    if (state.memory_size > state.memory_capacity) {
        const old_size = state.memory_size;
        const start_time = std.time.milliTimestamp();
        force_gc(state);
        const end_time = std.time.milliTimestamp();
        std.log.info("gc: time={d}ms, nodes freed={d}, heap size: {d}", .{ end_time - start_time, old_size - state.memory_size, state.memory_size });

        if (@intToFloat(f32, state.memory_size) / @intToFloat(f32, state.memory_capacity) > threshold_rate) {
            state.memory_capacity *= 2;
            std.log.info("gc: double heap capacity to {}", .{state.memory_capacity});
        }
    }
}

pub fn read_i32_from(buffer: []const u8, ip: u32) i32 {
    return buffer[ip] + @as(i32, 8) * buffer[ip + 1] + @as(i32, 65536) * buffer[ip + 2] + @as(i32, 16777216) * buffer[ip + 3];
}

pub fn init_memory_state(allocator: std.mem.Allocator, buffer: []const u8) !MemoryState {
    const default_colour = Colour.White;

    var activation = try allocator.create(Value);
    activation.colour = default_colour;
    activation.next = null;
    activation.v = ValueValue{ .a = Activation{ .parentActivation = null, .closure = null, .nextIP = 0, .data = null } };

    return MemoryState{
        .allocator = allocator,
        .ip = 4,
        .memory = buffer,
        .stack = std.ArrayList(*Value).init(allocator),
        .activation = activation,
        .colour = default_colour,
        .root = activation,
        .memory_size = 1, // initialised to 1 to accomodate the root activation record
        .memory_capacity = 32,
    };
}
