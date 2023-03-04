import {
  findBuiltin,
  findOnName as findInstruction,
  InstructionOpCode,
  OpParameter,
} from "./instructions.ts";

enum AsmMode {
  ACode,
  AData,
}

export const asm = (text: string): Uint8Array => {
  const lines = text.split("\n");
  const result: Array<number> = [];
  const labels = new Map<string, number>();
  const patch: Array<[number, string, string]> = [];
  let mode = AsmMode.ACode;

  const appendInt = (n: number) => {
    result.push(n & 0xFF);
    result.push((n >> 8) & 0xFF);
    result.push((n >> 16) & 0xFF);
    result.push((n >> 24) & 0xFF);
  };

  const writeIntAt = (n: number, pos: number) => {
    result[pos] = n & 0xFF;
    result[pos + 1] = (n >> 8) & 0xFF;
    result[pos + 2] = (n >> 16) & 0xFF;
    result[pos + 3] = (n >> 24) & 0xFF;
  };

  appendInt(-1);
  for (const line in lines) {
    const l = lines[line].trim();
    if (l.startsWith("#") || l === "") {
      continue;
    }
    if (l.startsWith(":")) {
      labels.set(l.slice(1), result.length);
      continue;
    }
    if (l.startsWith(".data")) {
      mode = AsmMode.AData;
      writeIntAt(result.length, 0);
      continue;
    }

    if (mode === AsmMode.AData) {
      if (l.startsWith("0x")) {
        const bytes = l.replaceAll("0x", "").split(" ");
        if (bytes === null) {
          throw new Error(`Invalid hex string: ${line}: ${l}`);
        }
        for (const byte of bytes) {
          result.push(parseInt(byte, 16));
        }
      } else {
        appendLiteralString(result, l);
      }
    } else {
      const [name, ...args] = l.split(" ");
      const instruction = findInstruction(name);
      if (instruction === undefined) {
        throw new Error(`Unknown instruction: ${line}: ${name}`);
      }
      if (instruction.opcode === InstructionOpCode.JMP_DATA) {
        result.push(instruction.opcode);

        const n = parseInt(args[0]);
        appendInt(n);
        if (args.length !== n + 1) {
          throw new Error(
            `Wrong number of arguments: ${line}: ${name}: expected ${
              n + 1
            }: got ${args.length}`,
          );
        }
        for (let i = 1; i < n + 1; i++) {
          const arg = args[i];
          patch.push([result.length, arg, line]);
          appendInt(0);
        }
      } else if (
        instruction.args.length === 1 &&
        instruction.args[0] === OpParameter.OPString
      ) {
        result.push(instruction.opcode);
        appendLiteralString(result, l.substring(name.length + 1));
      } else if (args.length !== instruction.args.length) {
        throw new Error(
          `Wrong number of arguments: ${line}: ${name}: expected ${instruction.args.length}: got ${args.length}`,
        );
      } else {
        result.push(instruction.opcode);
        for (const [i, arg] of args.entries()) {
          if (instruction.args[i] === OpParameter.OPInt) {
            try {
              appendInt(parseInt(args[i]));
            } catch (e) {
              throw new Error(
                `Invalid argument: ${line}: ${name}: ${arg}: ${e}`,
              );
            }
          } else if (instruction.args[i] === OpParameter.OPBuiltIn) {
            const builtIn = findBuiltin(arg);
            if (builtIn === undefined) {
              throw new Error(`Unknown built-in: ${line}: ${name}: ${arg}`);
            }
            appendLiteralString(result, builtIn.name);
          } else {
            patch.push([result.length, arg, line]);
            appendInt(0);
          }
        }
      }
    }
  }

  for (const [pos, label, line] of patch) {
    if (!labels.has(label)) {
      throw new Error(`Unknown label: ${line}: ${label}`);
    }
    writeIntAt(labels.get(label)!, pos);
  }

  return new Uint8Array(result);
};

export const writeBinary = (filename: string, data: Uint8Array) => {
  const file = Deno.createSync(filename);
  Deno.writeSync(file.rid, data);
  Deno.close(file.rid);
};

const appendLiteralString = (result: Array<number>, str: string) => {
  for (const c of str) {
    result.push(c.charCodeAt(0));
  }
  result.push(0);
};
