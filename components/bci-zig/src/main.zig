const std = @import("std");
const dis = @import("dis.zig").dis;
const execute = @import("run.zig").execute;

pub fn main() !void {
    const allocator = std.heap.page_allocator;

    var args = try std.process.argsAlloc(allocator);
    defer std.process.argsFree(allocator, args);

    if (args.len == 3 and std.mem.eql(u8, args[1], "dis")) {
        const buffer: []u8 = try loadBinary(allocator, args[2]);
        defer allocator.free(buffer);

        try dis(buffer);
    } else if (args.len == 3 and std.mem.eql(u8, args[1], "run")) {
        const buffer: []u8 = try loadBinary(allocator, args[2]);
        defer allocator.free(buffer);

        try execute(buffer, std.io.getStdOut());
    } else {
        std.debug.print("Usage: {s} [dis|run] <filename>\n", .{args[0]});
    }
}

fn loadBinary(allocator: std.mem.Allocator, fileName: [:0]const u8) ![]u8 {
    var file = std.fs.cwd().openFile(fileName, .{}) catch {
        std.debug.print("Unable to open file: {s}\n", .{fileName});
        std.os.exit(1);
    };
    defer file.close();

    const fileSize = try file.getEndPos();
    const buffer: []u8 = try file.readToEndAlloc(allocator, fileSize);

    return buffer;
}
