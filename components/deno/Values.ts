import { Expression } from "./Parser.ts";
import { TTuple, Type } from "./Typing.ts";

// deno-lint-ignore no-explicit-any
export type RuntimeValue = any;

class VTuple {
  values: Array<RuntimeValue>;

  constructor(values: Array<RuntimeValue>) {
    this.values = values;
  }
}

export const mkTuple = (values: Array<RuntimeValue>): RuntimeValue =>
  new VTuple(values);

export const isTuple = (value: RuntimeValue): boolean =>
  value instanceof VTuple;

export const tupleComponent = (
  value: RuntimeValue,
  index: number,
): RuntimeValue => value.values[index];

export const tupleComponents = (value: RuntimeValue): Array<RuntimeValue> =>
  value.values;

export const valueToString = (v: RuntimeValue): string => {
  if (v === null) {
    return "()";
  }
  if (typeof v === "string") {
    return `"${v.replaceAll('"', '\\"')}"`;
  }
  if (typeof v === "boolean" || typeof v === "number") {
    return `${v}`;
  }
  if (typeof v === "function") {
    return "function";
  }
  if (isTuple(v)) {
    return `(${
      tupleComponents(v).map((v: RuntimeValue) => valueToString(v)).join(", ")
    })`;
  }
  if (Array.isArray(v)) {
    if (v.length === 1) {
      return v[0];
    } else {
      const param = (p: RuntimeValue): string =>
        (Array.isArray(p) && p.length > 1)
          ? `(${valueToString(p)})`
          : valueToString(p);

      return `${v[0]} ${
        v.slice(1).map((v: RuntimeValue) => param(v)).join(" ")
      }`;
    }
  }

  return `${v}`;
};

export type NestedString = string | Array<NestedString>;

export const expressionToNestedString = (
  value: RuntimeValue,
  type: Type,
  expr: Expression,
): NestedString =>
  ((expr.type === "Let" || expr.type === "LetRec") && type instanceof TTuple)
    ? expr.declarations.map((d, i) =>
      `${d.name} = ${valueToString(value[i])}: ${type.types[i]}`
    )
    : `${valueToString(value)}: ${type}`;

export const nestedStringToString = (s: NestedString): string =>
  Array.isArray(s) ? s.map(nestedStringToString).join("\n") : s;
