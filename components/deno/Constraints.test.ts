import { assertEquals } from "https://deno.land/std@0.137.0/testing/asserts.ts";
import { Constraints } from "./Constraints.ts";
import { inferProgram } from "./Infer.ts";
import { parse } from "./Parser.ts";
import { createFresh, emptyTypeEnv, Type } from "./Typing.ts";

const solve = (expression: string): Array<Type> => {
  const [constraints, types] = inferProgram(
    emptyTypeEnv,
    parse(expression),
    new Constraints(),
    createFresh(),
  );

  const subst = constraints.solve();

  return types.map((t) => t.apply(subst));
};

const assertType = (expression: string, expected: Array<string>) => {
  assertEquals(
    expected.join(","),
    solve(expression).toString(),
  );
};

Deno.test("solve \\x -> \\y -> \\z -> x + y + z", () => {
  assertType(
    "\\x -> \\y -> \\z -> x + y + z",
    ["Int -> Int -> Int -> Int"],
  );
});

Deno.test("solve \\f -> \\g -> \\x -> f (g x)", () => {
  assertType(
    "\\f -> \\g -> \\x -> f (g x)",
    ["(V4 -> V5) -> (V3 -> V4) -> V3 -> V5"],
  );
});

Deno.test("solve match (1, 2) with (x, y) -> x + y", () => {
  assertType(
    "match (1, 2) with (x, y) -> x + y",
    ["Int"],
  );

  assertType(
    "let x = (1, (False, 99)) ; match x with (_, (False, x)) -> x | (x, (True, _)) -> x",
    ["((Int * (Bool * Int)))", "Int"],
  );
});

Deno.test("solve let rec? compose = \\f -> \\g -> \\x -> f (g x) ; compose", () => {
  assertType(
    "let compose = \\f -> \\g -> \\x -> f (g x) ; compose",
    [
      "((V4 -> V5) -> (V3 -> V4) -> V3 -> V5)",
      "(V6 -> V7) -> (V8 -> V6) -> V8 -> V7",
    ],
  );

  assertType(
    "let rec compose = \\f -> \\g -> \\x -> f (g x) ; compose",
    [
      "((V6 -> V7) -> (V5 -> V6) -> V5 -> V7)",
      "(V9 -> V10) -> (V11 -> V9) -> V11 -> V10",
    ],
  );
});

Deno.test("solve let rec? f = (\\x -> x) ; let rec? g = (f True) ; f 3", () => {
  assertType(
    "let f = (\\x -> x) ; let g = (f True) ; f 3",
    ["(V1 -> V1)", "(Bool)", "Int"],
  );

  assertType(
    "let f = (\\x -> x) ; let rec g = (f True) ; f 3",
    ["(V1 -> V1)", "(Bool)", "Int"],
  );

  assertType(
    "let rec f = (\\x -> x) ; let g = (f True) ; f 3",
    ["(V3 -> V3)", "(Bool)", "Int"],
  );

  assertType(
    "let rec f = (\\x -> x) ; let rec g = (f True) ; f 3",
    ["(V3 -> V3)", "(Bool)", "Int"],
  );
});

Deno.test("solve let rec? identity = \\n -> n ; identity", () => {
  assertType(
    "let identity = \\n -> n ; identity",
    ["(V1 -> V1)", "V2 -> V2"],
  );

  assertType(
    "let rec identity = \\n -> n ; identity",
    ["(V3 -> V3)", "V5 -> V5"],
  );
});

Deno.test("solve let rec? add a b = a + b and succ = add 1 ; succ 10", () => {
  assertType(
    "let add a b = a + b and succ = add 1 ; succ 10",
    ["(Int -> Int -> Int * Int -> Int)", "Int"],
  );

  assertType(
    "let rec add a b = a + b and succ = add 1 ; succ 10",
    ["(Int -> Int -> Int * Int -> Int)", "Int"],
  );
});

Deno.test("solve let rec fact n = if (n == 0) 1 else fact (n - 1) * n ; fact", () => {
  assertType(
    "let rec fact n = if (n == 0) 1 else fact(n - 1) * n ; fact",
    ["(Int -> Int)", "Int -> Int"],
  );
});

Deno.test("solve let rec isOdd n = if (n == 0) False else isEven (n - 1) and isEven n = if (n == 0) True else isOdd (n - 1) ; isOdd", () => {
  assertType(
    "let rec isOdd n = if (n == 0) False else isEven (n - 1) and isEven n = if (n == 0) True else isOdd (n - 1) ; isOdd",
    ["(Int -> Bool * Int -> Bool)", "Int -> Bool"],
  );
});

Deno.test("solve let rec a = b + 1 and b = a + 1 ; a", () => {
  assertType(
    "let rec a = b + 1 and b = a + 1 ; a",
    ["(Int * Int)", "Int"],
  );
});

Deno.test("solve let rec? identity a = a and v = identity 10 ; v", () => {
  assertType(
    "let identity a = a and v = identity 10 ; v",
    ["(V1 -> V1 * Int)", "Int"],
  );

  assertType(
    "let rec identity a = a and v = identity 10 ; v",
    ["(Int -> Int * Int)", "Int"],
  );
});

Deno.test("solve let rec? identity a = a ; let rec? v1 = identity 10 and v2 = identity True ; v?", () => {
  assertType(
    "let identity a = a ; let rec v1 = identity 10 and v2 = identity True ; v1",
    ["(V1 -> V1)", "(Int * Bool)", "Int"],
  );

  assertType(
    "let rec identity a = a ; let rec v1 = identity 10 and v2 = identity True ; v1",
    ["(V3 -> V3)", "(Int * Bool)", "Int"],
  );

  assertType(
    "let identity a = a ; let rec v1 = identity 10 and v2 = identity True ; v2",
    ["(V1 -> V1)", "(Int * Bool)", "Bool"],
  );

  assertType(
    "let rec identity a = a ; let rec v1 = identity 10 and v2 = identity True ; v2",
    ["(V3 -> V3)", "(Int * Bool)", "Bool"],
  );
});
