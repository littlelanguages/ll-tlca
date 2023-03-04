import { assertEquals } from "https://deno.land/std@0.137.0/testing/asserts.ts";
import { Constraints } from "./Constraints.ts";
import { inferPattern, inferProgram } from "./Infer.ts";
import { parse, Pattern } from "./Parser.ts";
import {
  createFresh,
  DataDefinition,
  emptyTypeEnv,
  Scheme,
  TArr,
  TCon,
  TVar,
  Type,
  typeBool,
  TypeEnv,
  typeInt,
} from "./Typing.ts";

const assertTypeEquals = (ts: Array<Type>, expected: Array<string>) => {
  assertEquals(ts.map((t) => t.toString()), expected);
};

const assertConstraintsEquals = (
  constraints: Constraints,
  expected: Array<string>,
) => {
  assertEquals(constraints.toString(), expected.join(", "));
};

Deno.test("infer Apply", () => {
  const [constraints, type] = inferProgram(
    emptyTypeEnv
      .extend(
        "a",
        new Scheme(new Set(["T"]), new TArr(new TVar("T"), new TVar("T"))),
      )
      .extend("b", new Scheme(new Set(), typeInt)),
    parse("a b"),
    new Constraints(),
    createFresh(),
  );

  assertConstraintsEquals(constraints, [
    "V1 -> V1 ~ Int -> V2",
  ]);
  assertTypeEquals(type, ["V2"]);
});

Deno.test("infer If", () => {
  const [constraints, type] = inferProgram(
    emptyTypeEnv
      .extend("a", new Scheme(new Set(["S"]), new TVar("S")))
      .extend("b", new Scheme(new Set(), typeInt))
      .extend("c", new Scheme(new Set(["T"]), new TVar("T"))),
    parse("if (a) b else c"),
    new Constraints(),
    createFresh(),
  );

  assertConstraintsEquals(constraints, [
    "V1 ~ Bool",
    "Int ~ V2",
  ]);
  assertTypeEquals(type, ["Int"]);
});

Deno.test("infer Lam", () => {
  const [constraints, type] = inferProgram(
    emptyTypeEnv,
    parse("\\x -> x 10"),
    new Constraints(),
    createFresh(),
  );

  assertConstraintsEquals(constraints, [
    "V1 ~ Int -> V2",
  ]);
  assertTypeEquals(type, ["V1 -> V2"]);
});

Deno.test("infer Let", () => {
  const [constraints, type] = inferProgram(
    emptyTypeEnv,
    parse("let x = 10 and y = x + 1 ; y"),
    new Constraints(),
    createFresh(),
  );

  assertConstraintsEquals(constraints, [
    "Int -> Int -> V1 ~ Int -> Int -> Int",
  ]);
  assertTypeEquals(type, ["(Int * Int)", "Int"]);
});

Deno.test("infer LBool", () => {
  const [constraints, type] = inferProgram(
    emptyTypeEnv,
    parse("True"),
    new Constraints(),
    createFresh(),
  );

  assertConstraintsEquals(constraints, []);
  assertTypeEquals(type, ["Bool"]);
});

Deno.test("infer LInt", () => {
  const [constraints, type] = inferProgram(
    emptyTypeEnv,
    parse("123"),
    new Constraints(),
    createFresh(),
  );

  assertEquals(constraints.constraints.length, 0);
  assertTypeEquals(type, ["Int"]);
});

Deno.test("infer LString", () => {
  const [constraints, type] = inferProgram(
    emptyTypeEnv,
    parse('"hello"'),
    new Constraints(),
    createFresh(),
  );

  assertEquals(constraints.constraints.length, 0);
  assertTypeEquals(type, ["String"]);
});

Deno.test("infer LTuple", () => {
  const [constraints, type] = inferProgram(
    emptyTypeEnv,
    parse('(1, "hello", True)'),
    new Constraints(),
    createFresh(),
  );

  assertEquals(constraints.constraints.length, 0);
  assertTypeEquals(type, ["(Int * String * Bool)"]);
});

Deno.test("infer LUnit", () => {
  const [constraints, type] = inferProgram(
    emptyTypeEnv,
    parse("()"),
    new Constraints(),
    createFresh(),
  );

  assertEquals(constraints.constraints.length, 0);
  assertTypeEquals(type, ["()"]);
});

Deno.test("infer Match", () => {
  const [constraints, type] = inferProgram(
    emptyTypeEnv,
    parse("match (1, 2) with (x, y) -> x + y"),
    new Constraints(),
    createFresh(),
  );

  assertConstraintsEquals(constraints, [
    "V2 -> V3 -> V4 ~ Int -> Int -> Int",
    "(V2 * V3) ~ (Int * Int)",
    "V4 ~ V1",
  ]);
  assertTypeEquals(type, ["V1"]);
});

Deno.test("infer PBool pattern", () => {
  assertInferPattern(
    { type: "PBool", value: true },
    [],
    "Bool",
  );

  assertInferPattern(
    { type: "PBool", value: false },
    [],
    "Bool",
  );
});

Deno.test("infer PCons pattern", () => {
  const origEnv = emptyTypeEnv.addData(
    new DataDefinition("List", ["a"], [
      new TCon("Nil", []),
      new TCon("Cons", [new TVar("a"), new TCon("List", [new TVar("a")])]),
    ]),
  );

  assertInferPatternWithEnv(
    origEnv,
    { type: "PCons", name: "Nil", args: [] },
    [],
    "List V1",
    origEnv,
  );

  assertInferPatternWithEnv(
    origEnv,
    {
      type: "PCons",
      name: "Cons",
      args: [{ type: "PVar", name: "x" }, { type: "PVar", name: "xs" }],
    },
    ["V2 ~ V1", "V3 ~ List V1"],
    "List V1",
    origEnv
      .extend("x", new Scheme(new Set(), new TVar("V2")))
      .extend("xs", new Scheme(new Set(), new TVar("V3"))),
  );
});

Deno.test("infer PInt pattern", () => {
  assertInferPattern(
    { type: "PInt", value: 123 },
    [],
    "Int",
  );
});

Deno.test("infer PString pattern", () => {
  assertInferPattern(
    { type: "PString", value: "hello" },
    [],
    "String",
  );
});

Deno.test("infer PTuple pattern", () => {
  assertInferPattern(
    {
      type: "PTuple",
      values: [
        { type: "PBool", value: true },
        { type: "PInt", value: 123 },
        { type: "PString", value: "hello" },
        { type: "PUnit" },
      ],
    },
    [],
    "(Bool * Int * String * ())",
  );
});

Deno.test("infer PUnit pattern", () => {
  assertInferPattern(
    { type: "PUnit" },
    [],
    "()",
  );
});

Deno.test("infer PVar pattern", () => {
  assertInferPattern(
    { type: "PVar", name: "x" },
    [],
    "V1",
    emptyTypeEnv.extend("x", new Scheme(new Set(), new TVar("V1"))),
  );
});

Deno.test("infer PWildCard pattern", () => {
  assertInferPattern(
    { type: "PWildcard" },
    [],
    "V1",
  );
});

Deno.test("infer Op", () => {
  const scenario = (input: string, resultType: Type) => {
    const [constraints, type] = inferProgram(
      emptyTypeEnv
        .extend("a", new Scheme(new Set(["T"]), new TVar("T")))
        .extend("b", new Scheme(new Set(["T"]), new TVar("T"))),
      parse(input),
      new Constraints(),
      createFresh(),
    );

    assertConstraintsEquals(constraints, [
      `V1 -> V2 -> V3 ~ Int -> Int -> ${resultType}`,
    ]);
    assertTypeEquals(type, ["V3"]);
  };

  scenario("a + b", typeInt);
  scenario("a - b", typeInt);
  scenario("a * b", typeInt);
  scenario("a / b", typeInt);
  scenario("a == b", typeBool);
});

Deno.test("infer Var", () => {
  const [constraints, type] = inferProgram(
    emptyTypeEnv.extend(
      "a",
      new Scheme(new Set(["T"]), new TArr(new TVar("T"), new TVar("T"))),
    ),
    parse("a"),
    new Constraints(),
    createFresh(),
  );

  assertConstraintsEquals(constraints, []);
  assertTypeEquals(type, ["V1 -> V1"]);
});

const assertInferPatternWithEnv = (
  defaultEnv: TypeEnv,
  input: Pattern,
  expectedConstraints: Array<string>,
  expectedType: string,
  expectedTypeEnv: TypeEnv = emptyTypeEnv,
) => {
  const constraints = new Constraints();

  const [type, typeEnv] = inferPattern(
    input,
    defaultEnv,
    constraints,
    createFresh(),
  );

  assertConstraintsEquals(constraints, expectedConstraints);
  assertEquals(type.toString(), expectedType);
  assertEquals(typeEnv, expectedTypeEnv);
};

const assertInferPattern = (
  input: Pattern,
  expectedConstraints: Array<string>,
  expectedType: string,
  expectedTypeEnv: TypeEnv = emptyTypeEnv,
) =>
  assertInferPatternWithEnv(
    emptyTypeEnv,
    input,
    expectedConstraints,
    expectedType,
    expectedTypeEnv,
  );
