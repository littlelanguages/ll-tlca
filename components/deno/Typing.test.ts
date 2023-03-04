import { assertEquals } from "https://deno.land/std@0.137.0/testing/asserts.ts";
import { nullSubs, Subst, TVar, typeBool, typeInt } from "./Typing.ts";

Deno.test("subst compose", () => {
  assertEquals(nullSubs.compose(nullSubs).entries().length, 0);

  const s11 = new Subst(new Map([["a", typeBool]]));
  const s12 = new Subst(new Map([["b", typeBool]]));
  assertEquals(s11.compose(s12).entries().length, 2);

  const s21 = new Subst(new Map([["a", typeBool]]));
  const s22 = new Subst(new Map([["a", typeInt]]));
  const s23 = s21.compose(s22);
  assertEquals(s23.entries().length, 1);
  assertEquals(s23.get("a"), typeBool);

  const s31 = new Subst(new Map([["a", typeBool]]));
  const s32 = new Subst(new Map([["b", new TVar("a")]]));
  const s33 = s31.compose(s32);
  assertEquals(s33.entries().length, 2);
  assertEquals(s33.get("a"), typeBool);
  assertEquals(s33.get("b"), typeBool);

  const s41 = new Subst(new Map([["b", new TVar("a")]]));
  const s42 = new Subst(new Map([["a", typeBool]]));
  const s43 = s41.compose(s42);
  assertEquals(s43.entries().length, 2);
  assertEquals(s43.get("a"), typeBool);
  assertEquals(s43.get("b"), new TVar("a"));
});
