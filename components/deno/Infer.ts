import { Expression, Op, Pattern, Program } from "./Parser.ts";
import { Constraints } from "./Constraints.ts";
import {
  applyArray,
  Pump,
  Scheme,
  Subst,
  TArr,
  TCon,
  TTuple,
  Type,
  typeBool,
  TypeEnv,
  typeError,
  typeInt,
  typeString,
  typeUnit,
} from "./Typing.ts";

const ops = new Map([
  [Op.Equals, new TArr(typeInt, new TArr(typeInt, typeBool))],
  [Op.Plus, new TArr(typeInt, new TArr(typeInt, typeInt))],
  [Op.Minus, new TArr(typeInt, new TArr(typeInt, typeInt))],
  [Op.Times, new TArr(typeInt, new TArr(typeInt, typeInt))],
  [Op.Divide, new TArr(typeInt, new TArr(typeInt, typeInt))],
]);

export const inferProgram = (
  env: TypeEnv,
  program: Program,
  constraints: Constraints,
  pump: Pump,
): [Constraints, Array<Type>, TypeEnv] => {
  const types: Array<Type> = [];
  program.forEach((e) => {
    if (e.type === "DataDeclaration") {
      throw new Error("inferProgram: Data declarations not supported yet");
    }

    const [, tp, newEnv] = inferExpression(e, env, constraints, pump);

    types.push(tp);
    env = newEnv;
  });

  return [constraints, types, env];
};

export const inferExpression = (
  expression: Expression,
  env: TypeEnv,
  constraints: Constraints,
  pump: Pump,
): [Constraints, Type, TypeEnv] => {
  const fix = (
    env: TypeEnv,
    expr: Expression,
    constraints: Constraints,
  ): Type => {
    const [_, t1] = inferExpression(expr, env, constraints, pump);
    const tv = pump.next();

    constraints.add(new TArr(tv, tv), t1);

    return tv;
  };

  const infer = (expr: Expression, env: TypeEnv): [Type, TypeEnv] => {
    if (expr.type === "App") {
      const [t1] = infer(expr.e1, env);
      const [t2] = infer(expr.e2, env);
      const tv = pump.next();

      constraints.add(t1, new TArr(t2, tv));

      return [tv, env];
    }
    if (expr.type === "If") {
      const [tg] = infer(expr.guard, env);
      const [tt] = infer(expr.then, env);
      const [et] = infer(expr.else, env);

      constraints.add(tg, typeBool);
      constraints.add(tt, et);

      return [tt, env];
    }
    if (expr.type === "Lam") {
      const tv = pump.next();
      const [t] = infer(
        expr.expr,
        env.extend(expr.name, new Scheme(new Set(), tv)),
      );
      return [new TArr(tv, t), env];
    }
    if (expr.type === "Let") {
      let newEnv = env;
      const types: Array<Type> = [];

      for (const declaration of expr.declarations) {
        const [nc, tb] = inferExpression(
          declaration.expr,
          newEnv,
          constraints,
          pump,
        );

        const subst = nc.solve();

        newEnv = newEnv.apply(subst);
        const type = tb.apply(subst);
        types.push(type);
        const sc = newEnv.generalise(type);
        newEnv = newEnv.extend(declaration.name, sc);
      }

      if (expr.expr === undefined) {
        return [new TTuple(types), newEnv];
      } else {
        return [infer(expr.expr, newEnv)[0], env];
      }
    }
    if (expr.type === "LetRec") {
      const tvs = pump.nextN(expr.declarations.length);
      const newEnv = expr.declarations.reduce(
        (acc, declaration, idx) =>
          acc.extend(declaration.name, new Scheme(new Set(), tvs[idx])),
        env,
      );

      const declarationType = fix(
        newEnv,
        {
          type: "Lam",
          name: "_bob",
          expr: {
            type: "LTuple",
            values: expr.declarations.map((d) => d.expr),
          },
        },
        constraints,
      );
      constraints.add(new TTuple(tvs), declarationType);
      const types: Array<Type> = [];

      const subst = constraints.solve();
      const solvedTypeEnv = env.apply(subst);
      const solvedEnv = expr.declarations.reduce(
        (acc, declaration, idx) => {
          const type: Type = tvs[idx].apply(subst);
          types.push(type);

          return acc.extend(
            declaration.name,
            solvedTypeEnv.generalise(type),
          );
        },
        solvedTypeEnv,
      );

      if (expr.expr === undefined) {
        return [new TTuple(types), solvedEnv];
      } else {
        return [infer(expr.expr, solvedEnv)[0], env];
      }
    }
    if (expr.type === "LBool") {
      return [typeBool, env];
    }
    if (expr.type === "LInt") {
      return [typeInt, env];
    }
    if (expr.type === "LString") {
      return [typeString, env];
    }
    if (expr.type === "LTuple") {
      return [new TTuple(expr.values.map((v) => infer(v, env)[0])), env];
    }
    if (expr.type === "LUnit") {
      return [typeUnit, env];
    }
    if (expr.type === "Match") {
      const [t] = infer(expr.expr, env);
      const tv = pump.next();

      for (const { pattern, expr: pexpr } of expr.cases) {
        const [tp, newEnv] = inferPattern(pattern, env, constraints, pump);
        const [te] = infer(pexpr, newEnv);
        constraints.add(tp, t);
        constraints.add(te, tv);
      }

      return [tv, env];
    }
    if (expr.type === "Op") {
      const [tl] = infer(expr.left, env);
      const [tr] = infer(expr.right, env);
      const tv = pump.next();

      const u1 = new TArr(tl, new TArr(tr, tv));
      const u2 = ops.get(expr.op)!;
      constraints.add(u1, u2);
      return [tv, env];
    }
    if (expr.type === "Var") {
      const scheme = env.scheme(expr.name);

      if (scheme === undefined) throw `Unknown name: ${expr.name}`;

      return [scheme.instantiate(pump), env];
    }

    return [typeError, env];
  };

  return [constraints, ...infer(expression, env)];
};

export const inferPattern = (
  pattern: Pattern,
  env: TypeEnv,
  constraints: Constraints,
  pump: Pump,
): [Type, TypeEnv] => {
  if (pattern.type === "PBool") {
    return [typeBool, env];
  }
  if (pattern.type === "PInt") {
    return [typeInt, env];
  }
  if (pattern.type === "PString") {
    return [typeString, env];
  }
  if (pattern.type === "PTuple") {
    const values: Array<Type> = [];
    let newEnv = env;
    for (const p of pattern.values) {
      const [t, e] = inferPattern(p, newEnv, constraints, pump);
      values.push(t);
      newEnv = e;
    }
    return [new TTuple(values), newEnv];
  }
  if (pattern.type === "PUnit") {
    return [typeUnit, env];
  }
  if (pattern.type === "PVar") {
    const tv = pump.next();
    return [tv, env.extend(pattern.name, new Scheme(new Set(), tv))];
  }
  if (pattern.type === "PWildcard") {
    return [pump.next(), env];
  }
  if (pattern.type === "PCons") {
    const c = env.findConstructor(pattern.name);

    if (c === undefined) {
      throw { type: "UnknownConstructorError", name: pattern.name };
    }

    const [constructor, adt] = c;
    if (constructor.args.length !== pattern.args.length) {
      throw {
        type: "ArityMismatchError",
        constructor: constructor,
        pattern,
      };
    }

    const parameters = pump.nextN(adt.parameters.length);
    const subst = new Subst(new Map(zip(adt.parameters, parameters)));
    const constructorArgTypes = applyArray(subst, constructor.args);

    let newEnv = env;
    pattern.args.forEach((p, i) => {
      const [t, e] = inferPattern(p, newEnv, constraints, pump);
      constraints.add(t, constructorArgTypes[i]);
      newEnv = e;
    });

    return [new TCon(adt.name, parameters), newEnv];
  }

  return [typeError, env];
};

const zip = <A, B>(a: Array<A>, b: Array<B>): Array<[A, B]> =>
  a.map((k, i) => [k, b[i]]);
