import { assertEquals } from "https://deno.land/std@0.137.0/testing/asserts.ts";
import { transformLiteralString } from "./Parser.ts";

Deno.test("transformLiteralString", () => {
  assertEquals(transformLiteralString('"foo"'), "foo");
  assertEquals(transformLiteralString('"\\"foo\\""'), '"foo"');
});
