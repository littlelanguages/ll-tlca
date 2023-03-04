import { parseProgram, SyntaxError, Visitor } from "./parser/Parser.ts";
import { Token } from "./parser/Scanner.ts";

export type Program = Array<Element>;

export type Element = Expression | DataDeclaration;

export type Expression =
  | AppExpression
  | IfExpression
  | LamExpression
  | LetExpression
  | LetRecExpression
  | LBoolExpression
  | LIntExpression
  | LStringExpression
  | LTupleExpression
  | LUnitExpression
  | MatchExpression
  | OpExpression
  | VarExpression;

export type AppExpression = {
  type: "App";
  e1: Expression;
  e2: Expression;
};

export type IfExpression = {
  type: "If";
  guard: Expression;
  then: Expression;
  else: Expression;
};

export type LetExpression = {
  type: "Let";
  declarations: Array<Declaration>;
  expr: Expression | undefined;
};

export type LetRecExpression = {
  type: "LetRec";
  declarations: Array<Declaration>;
  expr: Expression | undefined;
};

export type Declaration = {
  type: "Declaration";
  name: string;
  expr: Expression;
};

export type LamExpression = {
  type: "Lam";
  name: string;
  expr: Expression;
};

export type LBoolExpression = {
  type: "LBool";
  value: boolean;
};

export type LIntExpression = {
  type: "LInt";
  value: number;
};

export type LStringExpression = {
  type: "LString";
  value: string;
};

export type LTupleExpression = {
  type: "LTuple";
  values: Array<Expression>;
};

export type LUnitExpression = {
  type: "LUnit";
};

export type MatchExpression = {
  type: "Match";
  expr: Expression;
  cases: Array<MatchCase>;
};

export type OpExpression = {
  type: "Op";
  left: Expression;
  op: Op;
  right: Expression;
};

export enum Op {
  Equals,
  Plus,
  Minus,
  Times,
  Divide,
}

export type VarExpression = {
  type: "Var";
  name: string;
};

export type MatchCase = {
  pattern: Pattern;
  expr: Expression;
};

export type Pattern =
  | ConsPattern
  | LBoolPattern
  | LIntPattern
  | LStringPattern
  | LTuplePattern
  | LUnitPattern
  | VarPattern
  | WildCardPattern;

export type ConsPattern = {
  type: "PCons";
  name: string;
  args: Array<Pattern>;
};

export type LBoolPattern = {
  type: "PBool";
  value: boolean;
};

export type LIntPattern = {
  type: "PInt";
  value: number;
};

export type LStringPattern = {
  type: "PString";
  value: string;
};

export type LTuplePattern = {
  type: "PTuple";
  values: Array<Pattern>;
};

export type LUnitPattern = {
  type: "PUnit";
};

export type VarPattern = {
  type: "PVar";
  name: string;
};

export type WildCardPattern = {
  type: "PWildcard";
};

export type DataDeclaration = {
  type: "DataDeclaration";
  declarations: Array<TypeDeclaration>;
};

export type TypeDeclaration = {
  type: "TypeDeclaration";
  name: string;
  parameters: Array<string>;
  constructors: Array<ConstructorDeclaration>;
};

export type ConstructorDeclaration = {
  type: "ConstructorDeclaration";
  name: string;
  parameters: Array<Type>;
};

export type Type =
  | TypeVariable
  | TypeConstructor
  | TypeTuple
  | TypeFunction
  | TypeUnit;

export type TypeVariable = {
  type: "TypeVariable";
  name: string;
};

export type TypeConstructor = {
  type: "TypeConstructor";
  name: string;
  arguments: Array<Type>;
};

export type TypeTuple = {
  type: "TypeTuple";
  values: Array<Type>;
};

export type TypeFunction = {
  type: "TypeFunction";
  left: Type;
  right: Type;
};

export type TypeUnit = {
  type: "TypeUnit";
};

export const transformLiteralString = (s: string): string =>
  s.substring(1, s.length - 1).replaceAll('\\"', '"');

export const parse = (input: string): Program =>
  parseProgram(input, visitor).either((l: SyntaxError): Program => {
    throw l;
  }, (r: Array<Element>): Program => r);

const visitor: Visitor<
  Array<Element>,
  Element,
  Expression,
  Expression,
  Expression,
  string,
  Expression,
  string,
  Expression,
  Declaration,
  MatchCase,
  Pattern,
  DataDeclaration,
  TypeDeclaration,
  ConstructorDeclaration,
  Type,
  Type,
  Type
> = {
  visitProgram: (
    a1: Expression,
    a2: Array<[Token, Expression]>,
  ): Array<Expression> => [a1].concat(a2.map(([, e]) => e)),

  visitElement1: (a1: Expression): Element => a1,
  visitElement2: (a1: DataDeclaration): Element => a1,

  visitExpression: (a1: Expression, a2: Array<Expression>): Expression =>
    a2.reduce((acc: Expression, e: Expression): Expression => ({
      type: "App",
      e1: acc,
      e2: e,
    }), a1),

  visitRelational: (
    a1: Expression,
    a2: [Token, Expression] | undefined,
  ): Expression =>
    a2 === undefined
      ? a1
      : { type: "Op", left: a1, op: Op.Equals, right: a2[1] },

  visitMultiplicative: (
    a1: Expression,
    a2: Array<[string, Expression]>,
  ): Expression =>
    a2 === undefined ? a1 : a2.reduce(
      (acc: Expression, e: [string, Expression]): Expression => ({
        type: "Op",
        left: acc,
        right: e[1],
        op: e[0] === "*" ? Op.Times : Op.Divide,
      }),
      a1,
    ),

  visitMultiplicativeOps1: (a: Token): string => a[2],
  visitMultiplicativeOps2: (a: Token): string => a[2],

  visitAdditive: (
    a1: Expression,
    a2: Array<[string, Expression]>,
  ): Expression =>
    a2 === undefined ? a1 : a2.reduce(
      (acc: Expression, e: [string, Expression]): Expression => ({
        type: "Op",
        left: acc,
        right: e[1],
        op: e[0] === "+" ? Op.Plus : Op.Minus,
      }),
      a1,
    ),

  visitAdditiveOps1: (a: Token): string => a[2],
  visitAdditiveOps2: (a: Token): string => a[2],

  visitFactor1: (
    _a1: Token,
    a2: [Expression, Array<[Token, Expression]>] | undefined,
    _a3: Token,
  ): Expression =>
    a2 === undefined
      ? { type: "LUnit" }
      : a2[1].length === 0
      ? a2[0]
      : { type: "LTuple", values: [a2[0]].concat(a2[1].map(([, e]) => e)) },

  visitFactor2: (a: Token): Expression => ({
    type: "LInt",
    value: parseInt(a[2]),
  }),

  visitFactor3: (a: Token): Expression => ({
    type: "LString",
    value: transformLiteralString(a[2]),
  }),

  visitFactor4: (_a: Token): Expression => ({
    type: "LBool",
    value: true,
  }),

  visitFactor5: (_a: Token): Expression => ({
    type: "LBool",
    value: false,
  }),

  visitFactor6: (
    _a1: Token,
    a2: Token,
    a3: Array<Token>,
    _a4: Token,
    a5: Expression,
  ): Expression =>
    composeLambda([a2].concat(a3).map((n: Token): string => n[2]), a5),

  visitFactor7: (
    _a1: Token,
    a2: Token | undefined,
    a3: Declaration,
    a4: Array<[Token, Declaration]>,
    a5: [Token, Expression] | undefined,
  ): Expression => ({
    type: a2 === undefined ? "Let" : "LetRec",
    declarations: [a3].concat(a4.map((a) => a[1])),
    expr: a5 === undefined ? undefined : a5[1],
  }),

  visitFactor8: (
    _a1: Token,
    _a2: Token,
    a3: Expression,
    _a4: Token,
    a5: Expression,
    _a6: Token,
    a7: Expression,
  ): Expression => ({
    type: "If",
    guard: a3,
    then: a5,
    else: a7,
  }),

  visitFactor9: (a: Token): Expression => ({
    type: "Var",
    name: a[2],
  }),

  visitFactor10: (a: Token): Expression => ({
    type: "Var",
    name: a[2],
  }),

  visitFactor11: (
    _a1: Token,
    a2: Expression,
    _a3: Token,
    _a4: Token | undefined,
    a5: MatchCase,
    a6: Array<[Token, MatchCase]>,
  ): Expression => ({
    type: "Match",
    expr: a2,
    cases: [a5].concat(a6.map((a) => a[1])),
  }),

  visitValueDeclaration: (
    a1: Token,
    a2: Array<Token>,
    _a3: Token,
    a4: Expression,
  ): Declaration => ({
    type: "Declaration",
    name: a1[2],
    expr: composeLambda(a2.map((n) => n[2]), a4),
  }),

  visitCase: (a1: Pattern, _a2: Token, a3: Expression): MatchCase => ({
    pattern: a1,
    expr: a3,
  }),

  visitPattern1: (
    _a1: Token,
    a2: [Pattern, Array<[Token, Pattern]>] | undefined,
    _a3: Token,
  ): Pattern =>
    a2 === undefined
      ? { type: "PUnit" }
      : a2[1].length === 0
      ? a2[0]
      : { type: "PTuple", values: [a2[0]].concat(a2[1].map(([, e]) => e)) },

  visitPattern2: (a: Token): Pattern => ({
    type: "PInt",
    value: parseInt(a[2]),
  }),

  visitPattern3: (a: Token): Pattern => ({
    type: "PString",
    value: transformLiteralString(a[2]),
  }),

  visitPattern4: (_a: Token): Pattern => ({
    type: "PBool",
    value: true,
  }),

  visitPattern5: (_a: Token): Pattern => ({
    type: "PBool",
    value: false,
  }),

  visitPattern6: (a: Token): Pattern =>
    a[2] === "_" ? { type: "PWildcard" } : {
      type: "PVar",
      name: a[2],
    },

  visitPattern7: (a1: Token, a2: Array<Pattern>): Pattern => ({
    type: "PCons",
    name: a1[2],
    args: a2,
  }),

  visitDataDeclaration: (
    _a1: Token,
    a2: TypeDeclaration,
    a3: Array<[Token, TypeDeclaration]>,
  ): DataDeclaration => ({
    type: "DataDeclaration",
    declarations: [a2].concat(a3.map((a) => a[1])),
  }),

  visitTypeDeclaration: (
    a1: Token,
    a2: Array<Token>,
    _a3: Token,
    a4: ConstructorDeclaration,
    a5: Array<[Token, ConstructorDeclaration]>,
  ): TypeDeclaration => ({
    type: "TypeDeclaration",
    name: a1[2],
    parameters: a2.map((a) => a[2]),
    constructors: [a4].concat(a5.map((a) => a[1])),
  }),

  visitConstructorDeclaration: (
    a1: Token,
    a2: Array<Type>,
  ): ConstructorDeclaration => ({
    type: "ConstructorDeclaration",
    name: a1[2],
    parameters: a2,
  }),

  visitType: (a1: Type, a2: Array<[Token, Type]>): Type =>
    composeFunctionType([a1].concat(a2.map((a) => a[1]))),

  visitADTType1: (a1: Token, a2: Array<Type>): Type => ({
    type: "TypeConstructor",
    name: a1[2],
    arguments: a2,
  }),
  visitADTType2: (a: Type): Type => a,

  visitTermType1: (a: Token): Type => ({
    type: "TypeVariable",
    name: a[2],
  }),
  visitTermType2: (
    _a1: Token,
    a2: [Type, Array<[Token, Type]>] | undefined,
    _a3: Token,
  ): Type =>
    a2 === undefined ? { type: "TypeUnit" } : a2[1].length === 0 ? a2[0] : {
      type: "TypeTuple",
      values: [a2[0]].concat(a2[1].map(([, e]) => e)),
    },
};

const composeLambda = (names: Array<string>, expr: Expression): Expression =>
  names.reduceRight((acc, name) => ({
    type: "Lam",
    name,
    expr: acc,
  }), expr);

const composeFunctionType = (types: Array<Type>): Type =>
  types.slice(1).reduceRight((acc, type) => ({
    type: "TypeFunction",
    left: acc,
    right: type,
  }), types[0]);

// console.log(JSON.stringify(parse("data List n = Nil | Cons n (List n) ; let compose f g x = f(g x) ; compose"), null, 2));
