import { defaultEnv, Env, executeProgram } from "./Interpreter.ts";
import { parse } from "./Parser.ts";
import { Subst, TVar, Type } from "./Typing.ts";
import {
  expressionToNestedString,
  nestedStringToString,
  valueToString,
} from "./Values.ts";

const readline = (): string | null => {
  let result = "";

  while (true) {
    const line = prompt(result === "" ? ">" : ".");

    if (line === null) {
      return null;
    }

    result = (result + "\n" + line).trim();

    if (result.endsWith(";;")) {
      return result.substring(0, result.length - 2);
    }
  }
};

const renameTypeVariables = (type: Type): Type => {
  let i = 0;

  const nextVar = (): string => {
    if (i < 26) {
      return String.fromCharCode(97 + i++);
    } else {
      return `t${i++}`;
    }
  };

  const vars = type.ftv();
  const subst = new Subst(
    new Map([...vars].map((v) => [v, new TVar(nextVar())])),
  );
  return type.apply(subst);
};

const execute = (line: string, env: Env): Env => {
  const ast = parse(line);
  const [result, newEnv] = executeProgram(ast, env);

  ast.forEach((e, i) => {
    if (e.type === "DataDeclaration") {
      console.log(result[i][0].toString());
    } else {
      const [value, type] = result[i];

      console.log(
        nestedStringToString(
          expressionToNestedString(value, renameTypeVariables(type!), e),
        ),
      );
    }
  });

  return newEnv;
};

if (Deno.args.length === 0) {
  console.log(
    "Welcome to the REPL of the Lambda Calculus with ADTs Interpreter!",
  );
  console.log('Type ".quit" to exit.');
  console.log("Enter a multi-line expression with ;; as a terminator.");

  let env = defaultEnv;

  while (true) {
    const line = readline();

    if (line == null) {
      break;
    }

    switch (line.trim()) {
      case ".quit":
        console.log("bye...");
        Deno.exit(0);
        break;
      case ".env":
        console.log("Runtime Environment");
        for (const field in env[0]) {
          console.log(
            `  ${field} = ${valueToString(env[0][field])}: ${
              env[1].scheme(field)
            }`,
          );
        }
        console.log("Data Declarations");
        console.log(env[1].adts.map((a) => `  ${a}`).join("\n"));
        break;
      default:
        try {
          env = execute(line, env);
        } catch (e) {
          console.error(e);
        }
    }
  }
} else if (Deno.args.length === 1) {
  execute(Deno.readTextFileSync(Deno.args[0]), defaultEnv);
} else {
  console.error("Invalid arguments");
}
