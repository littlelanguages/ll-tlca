import { find, InstructionOpCode, OpParameter } from "./instructions.ts";

// import { writeAllSync } from "https://deno.land/std/streams/conversion.ts";

type Value =
  | BoolValue
  | BuiltinValue
  | BuiltinClosureValue
  | ClosureValue
  | DataValue
  | IntValue
  | StringValue
  | TupleValue
  | UnitValue;

type BoolValue = {
  tag: "BoolValue";
  value: boolean;
};

type BuiltinValue = {
  tag: "BuiltinValue";
  name: string;
};

type BuiltinClosureValue = {
  tag: "BuiltinClosureValue";
  value: (v: Value) => Value | undefined;
};

type ClosureValue = {
  tag: "ClosureValue";
  ip: number;
  previous: Activation;
};

type DataValue = {
  tag: "DataValue";
  meta: number;
  id: number;
  values: Array<Value>;
};

type IntValue = {
  tag: "IntValue";
  value: number;
};

type StringValue = {
  tag: "StringValue";
  value: string;
};

type TupleValue = {
  tag: "TupleValue";
  values: Array<Value>;
};

type UnitValue = {
  tag: "UnitValue";
};

const builtins: {
  [key: string]: (stack: Array<Value>, block: Uint8Array) => void;
} = {
  "$$builtin-print": (stack: Array<Value>, block: Uint8Array) => {
    const v = stack.pop()!;
    print(valueToString(v, ValueToStringStyle.VSSRaw, block));
  },
  "$$builtin-print-literal": (stack: Array<Value>, block: Uint8Array) => {
    const v = stack.pop()!;
    print(valueToString(v, ValueToStringStyle.VSSLiteral, block));
  },
  "$$builtin-print-typed": (stack: Array<Value>, block: Uint8Array) => {
    const v = stack.pop()!;
    print(valueToString(v, ValueToStringStyle.VSSTyped, block));
  },
  "$$builtin-println": (stack: Array<Value>, _block: Uint8Array) => {
    stack.pop()!;
    print("\n");
  },
  "$$builtin-string-compare": (stack: Array<Value>, _block: Uint8Array) => {
    const v1 = stack.pop()!;
    stack.push({
      tag: "BuiltinClosureValue",
      value: (v2: Value): Value =>
        v1.tag === "StringValue" && v2.tag === "StringValue"
          ? {
            tag: "IntValue",
            value: v1.value === v2.value ? 0 : v1.value < v2.value ? -1 : 1,
          }
          : { tag: "IntValue", value: 0 },
    });
  },
  "$$builtin-string-concat": (stack: Array<Value>, _block: Uint8Array) => {
    const v1 = stack.pop()!;
    stack.push({
      tag: "BuiltinClosureValue",
      value: (v2: Value): Value =>
        v1.tag === "StringValue" && v2.tag === "StringValue"
          ? { tag: "StringValue", value: `${v1.value}${v2.value}` }
          : { tag: "StringValue", value: "" },
    });
  },
  "$$builtin-string-equal": (stack: Array<Value>, _block: Uint8Array) => {
    const v1 = stack.pop()!;
    stack.push({
      tag: "BuiltinClosureValue",
      value: (v2: Value): Value =>
        v1.tag === "StringValue" && v2.tag === "StringValue"
          ? { tag: "BoolValue", value: v1.value === v2.value }
          : { tag: "BoolValue", value: false },
    });
  },
  "$$builtin-string-length": (stack: Array<Value>, _block: Uint8Array) => {
    const v = stack.pop()!;
    stack.push({
      tag: "IntValue",
      value: v.tag === "StringValue" ? v.value.length : 0,
    });
  },
  "$$builtin-string-substring": (stack: Array<Value>, _block: Uint8Array) => {
    const v1 = stack.pop()!;
    stack.push({
      tag: "BuiltinClosureValue",
      value: (v2: Value): Value => ({
        tag: "BuiltinClosureValue",
        value: (v3: Value): Value =>
          v1.tag === "StringValue" && v2.tag === "IntValue" &&
            v3.tag === "IntValue" && v2.value < v3.value
            ? {
              tag: "StringValue",
              value: v1.value.substring(v2.value, v3.value),
            }
            : { tag: "StringValue", value: "" },
      }),
    });
  },
};

const print = (v: string) => {
  // deno-lint-ignore no-deprecated-deno-api
  Deno.writeAllSync(Deno.stdout, encoder.encode(v));
};

const readIntFrom = (ip: number, block: Uint8Array): number =>
  block[ip] | (block[ip + 1] << 8) | (block[ip + 2] << 16) |
  (block[ip + 3] << 24);

enum ValueToStringStyle {
  VSSRaw,
  VSSLiteral,
  VSSTyped,
}

const valueToString = (
  v: Value,
  style: ValueToStringStyle,
  block: Uint8Array,
): string => {
  const dataNames = (meta: number): Array<string> => {
    const names: Array<string> = [];

    const numberOfNames = readIntFrom(meta, block) + 1;
    let nameIndex = 0;
    let i = meta + 4;
    while (nameIndex < numberOfNames) {
      const name: Array<string> = [];
      while (true) {
        const n = block[i++];
        if (n === 0) {
          break;
        }
        name.push(String.fromCharCode(n));
      }
      names.push(name.join(""));
      nameIndex++;
    }

    return names;
  };

  const value = (v: Value): string => {
    const activationDepth = (a: Activation | undefined): number =>
      a === undefined
        ? 0
        : a[1] === null
        ? 1
        : 1 + activationDepth(a[1].previous);

    switch (v.tag) {
      case "BoolValue":
        return `${v.value}`;
      case "BuiltinValue":
        return v.name;
      case "BuiltinClosureValue":
        return "builtin-closure";
      case "ClosureValue":
        return style === ValueToStringStyle.VSSRaw
          ? `c${v.ip}#${activationDepth(v.previous)}`
          : "function";
      case "DataValue": {
        const names = dataNames(v.meta);

        return `${names[v.id + 1]}${
          v.values.map((e) =>
            e.tag === "DataValue" && e.values.length > 0
              ? ` (${value(e)})`
              : ` ${value(e)}`
          ).join("")
        }`;
      }
      case "IntValue":
        return `${v.value}`;
      case "StringValue":
        return style === ValueToStringStyle.VSSRaw
          ? v.value
          : `"${v.value.replaceAll('"', '\\"')}"`;
      case "TupleValue":
        return `(${v.values.map(value).join(", ")})`;
      case "UnitValue":
        return "()";
    }
  };

  const type = (v: Value): string => {
    switch (v.tag) {
      case "BoolValue":
        return "Bool";
      case "BuiltinValue":
        return "Builtin";
      case "BuiltinClosureValue":
        return "BuiltinClosure";
      case "ClosureValue":
        return "Closure";
      case "DataValue":
        return dataNames(v.meta)[0];
      case "IntValue":
        return "Int";
      case "StringValue":
        return "String";
      case "TupleValue":
        return `(${v.values.map(type).join(" * ")})`;
      case "UnitValue":
        return "Unit";
    }
  };

  if (v === undefined) {
    return "-X-";
  }

  return style === ValueToStringStyle.VSSTyped
    ? `${value(v)}: ${type(v)}`
    : value(v);
};

type Activation = [
  Activation | null,
  ClosureValue | null,
  number | null,
  Array<Value> | null,
];

export type ExecuteOptions = {
  debug?: boolean;
};

const encoder = new TextEncoder();

export const execute = (
  block: Uint8Array,
  ip: number,
  options: ExecuteOptions = { debug: true },
) => {
  const stack: Array<Value> = [];
  let activation: Activation = [null, null, null, null];

  const stackToString = (): string => {
    const activationToString = (a: Activation): string => {
      const [, closure, ip, variables] = a;

      const activationString = a[0] === null ? "-" : activationToString(a[0]);
      const closureString = closure === null
        ? "-"
        : valueToString(closure, ValueToStringStyle.VSSRaw, block);
      const ipString = ip === null ? "-" : `${ip}`;
      const variablesString = variables === null
        ? "-"
        : `[${
          variables.map((v) =>
            valueToString(v, ValueToStringStyle.VSSRaw, block)
          ).join(", ")
        }]`;

      return `<${activationString}, ${closureString}, ${ipString}, ${variablesString}>`;
    };

    return `[${
      stack.map((v) => valueToString(v, ValueToStringStyle.VSSRaw, block)).join(
        ", ",
      )
    }] :: ${activationToString(activation)}`;
  };

  const readIntFrom = (ip: number): number =>
    block[ip] | (block[ip + 1] << 8) | (block[ip + 2] << 16) |
    (block[ip + 3] << 24);

  const readStringFrom = (tip: number): [number, string] => {
    const result: Array<string> = [];
    while (true) {
      const n = block[tip++];
      if (n === 0) {
        break;
      }
      result.push(String.fromCharCode(n));
    }
    return [tip, result.join("")];
  };

  const logInstruction = (instruction: InstructionOpCode) => {
    const op = find(instruction);

    if (op !== undefined) {
      const args: Array<string> = [];

      let tip = ip;
      op.args.forEach((p) => {
        if (p === OpParameter.OPBuiltIn || p === OpParameter.OPString) {
          const [newIP, str] = readStringFrom(tip);
          args.push(str);
          tip = newIP;
        } else {
          args.push(readIntFrom(tip).toString());
          tip += 4;
        }
      });

      console.log(
        `${ip - 1}: ${op.name}${args.length > 0 ? " " : ""}${
          args.join(" ")
        }: ${stackToString()}`,
      );
    }
  };

  const bciState = (n = 0): string => {
    return `ip: ${
      ip - n
    }, stack: ${stackToString()}, activation: ${activation}`;
  };

  const readInt = (): number => {
    const n = readIntFrom(ip);
    ip += 4;
    return n;
  };

  const readString: () => string = () => {
    const [newIP, str] = readStringFrom(ip);
    ip = newIP;

    return str;
  };

  readInt(); // skip offset to data segment

  while (true) {
    const op = block[ip++];

    if (options.debug) {
      logInstruction(op);
    }

    switch (op) {
      case InstructionOpCode.PUSH_BUILTIN: {
        const builtin = readString();
        if (builtins[builtin] === undefined) {
          throw new Error(`Unknown builtin: ${builtin}: ${bciState(1)}`);
        }

        stack.push({ tag: "BuiltinValue", name: builtin });
        break;
      }
      case InstructionOpCode.PUSH_CLOSURE: {
        const targetIP = readInt();

        const argument: ClosureValue = {
          tag: "ClosureValue",
          ip: targetIP,
          previous: activation,
        };
        stack.push(argument);
        break;
      }
      case InstructionOpCode.PUSH_DATA: {
        const meta = readInt();
        const id = readInt();
        const size = readInt();
        const values = stack.splice(stack.length - size, size);
        stack.push({ tag: "DataValue", meta, id, values });
        break;
      }
      case InstructionOpCode.PUSH_DATA_ITEM: {
        const offset = readInt();
        const value = stack.pop() as DataValue;
        stack.push(value.values[offset]);
        break;
      }
      case InstructionOpCode.PUSH_TRUE: {
        stack.push({ tag: "BoolValue", value: true });
        break;
      }
      case InstructionOpCode.PUSH_FALSE: {
        stack.push({ tag: "BoolValue", value: false });
        break;
      }
      case InstructionOpCode.PUSH_INT: {
        const value = readInt();

        stack.push({ tag: "IntValue", value });
        break;
      }
      case InstructionOpCode.PUSH_STRING: {
        const value = readString();

        stack.push({ tag: "StringValue", value });
        break;
      }
      case InstructionOpCode.PUSH_TUPLE: {
        const size = readInt();
        const values = stack.splice(stack.length - size, size);
        stack.push({ tag: "TupleValue", values });
        break;
      }
      case InstructionOpCode.PUSH_TUPLE_ITEM: {
        const offset = readInt();
        const value = stack.pop() as TupleValue;
        stack.push(value.values[offset]);
        break;
      }
      case InstructionOpCode.PUSH_UNIT: {
        stack.push({ tag: "UnitValue" });
        break;
      }
      case InstructionOpCode.PUSH_VAR: {
        let index = readInt();
        const offset = readInt();

        let a = activation;
        while (index > 0) {
          a = a[1]!.previous;
          index -= 1;
        }
        stack.push(a![3]![offset]);
        break;
      }
      case InstructionOpCode.DUP: {
        stack.push(stack[stack.length - 1]);
        break;
      }
      case InstructionOpCode.DISCARD: {
        stack.pop();
        break;
      }
      case InstructionOpCode.SWAP: {
        const a = stack.pop() as Value;
        const b = stack.pop() as Value;
        stack.push(a);
        stack.push(b);
        break;
      }
      case InstructionOpCode.ADD: {
        const b = stack.pop() as IntValue;
        const a = stack.pop() as IntValue;

        stack.push({ tag: "IntValue", value: (a.value + b.value) | 0 });
        break;
      }
      case InstructionOpCode.SUB: {
        const b = stack.pop() as IntValue;
        const a = stack.pop() as IntValue;

        stack.push({ tag: "IntValue", value: (a.value - b.value) | 0 });
        break;
      }
      case InstructionOpCode.MUL: {
        const b = stack.pop() as IntValue;
        const a = stack.pop() as IntValue;

        stack.push({ tag: "IntValue", value: (a.value * b.value) | 0 });
        break;
      }
      case InstructionOpCode.DIV: {
        const b = stack.pop() as IntValue;
        const a = stack.pop() as IntValue;

        stack.push({ tag: "IntValue", value: (a.value / b.value) | 0 });
        break;
      }
      case InstructionOpCode.EQ: {
        const a = stack.pop() as IntValue;
        const b = stack.pop() as IntValue;

        stack.push({ tag: "BoolValue", value: a.value === b.value });
        break;
      }
      case InstructionOpCode.JMP: {
        ip = readInt();
        break;
      }

      case InstructionOpCode.JMP_DATA: {
        readInt();
        const v = stack.pop() as DataValue;

        ip = readIntFrom(ip + v.id * 4);

        break;
      }

      case InstructionOpCode.JMP_FALSE: {
        const targetIP = readInt();
        const v = stack.pop() as BoolValue;

        if (!v.value) {
          ip = targetIP;
        }

        break;
      }
      case InstructionOpCode.JMP_TRUE: {
        const targetIP = readInt();
        const v = stack.pop() as BoolValue;

        if (v.value) {
          ip = targetIP;
        }

        break;
      }
      case InstructionOpCode.SWAP_CALL: {
        const v = stack.pop()!;
        const closure = stack.pop()!;

        if (closure.tag === "ClosureValue") {
          stack.push(v);
          const newActivation: Activation = [activation, closure, ip, null];
          ip = closure.ip;
          activation = newActivation;
        } else if (closure.tag === "BuiltinValue") {
          stack.push(v);
          const builtin = builtins[closure.name];
          if (builtin === undefined) {
            throw new Error(`Unknown builtin: ${closure.name}: ${bciState(1)}`);
          }
          builtin(stack, block);
        } else if (closure.tag === "BuiltinClosureValue") {
          const result = closure.value(v);
          if (result !== undefined) {
            stack.push(result);
          }
        } else {
          stack.push(v);
          throw new Error(`SWAP_CALL: Not a closure: ${bciState(1)}`);
        }
        break;
      }
      case InstructionOpCode.ENTER: {
        const size = readInt();

        if (activation[3] === null) {
          activation[3] = Array(size).fill(undefined);
        } else {
          throw new Error(`ENTER: Activation already exists: ${bciState()}`);
        }
        break;
      }
      case InstructionOpCode.RET: {
        if (activation[2] === null) {
          const v = stack.pop()!;

          if (v.tag !== "UnitValue") {
            console.log(valueToString(v, ValueToStringStyle.VSSTyped, block));
          }
          Deno.exit(0);
        }

        ip = activation[2];
        activation = activation[0]!;
        break;
      }
      case InstructionOpCode.STORE_VAR: {
        const index = readInt();

        if (activation[3] === null) {
          throw new Error(
            `STORE_VAR: Activation does not exist: ${bciState()}`,
          );
        } else {
          activation[3][index] = stack.pop() as Value;
        }
        break;
      }
      default:
        throw new Error(`Unknown InstructionOpCode: ${op} at ${ip - 1}}`);
    }
  }
};
