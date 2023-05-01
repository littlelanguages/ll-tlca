const std = @import("std");
const instructions = @import("instructions.zig").instructions;

fn readI32(buffer: []const u8, ip: usize) i32 {
    return buffer[ip] + @as(i32, 8) * buffer[ip + 1] + @as(i32, 65536) * buffer[ip + 2] + @as(i32, 16777216) * buffer[ip + 3];
}

pub fn dis(buffer: []const u8) !void {
    // std.debug.print("File contents: {}: {d}\n", .{ @TypeOf(buffer), buffer });

    var ip: usize = 0;
    while (ip < buffer.len) {
        const instruction = buffer[ip];

        std.debug.print("{}: {s}", .{ ip, instructions[instruction].name });
        ip += 1;

        for (instructions[instruction].parameters) |parameter| {
            _ = parameter;
            const value = readI32(buffer, ip);

            std.debug.print(" {}", .{value});
            ip += 4;
        }
        std.debug.print("\n", .{});
    }
}
