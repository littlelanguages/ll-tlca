import * as CLI from "https://raw.githubusercontent.com/littlelanguages/deno-lib-console-cli/0.1.2/mod.ts";

import { asm, writeBinary } from "./asm.ts";
import { dis, readBinary } from "./dis.ts";
import { execute } from "./run.ts";

const asmCmd = new CLI.ValueCommand(
  "asm",
  "Assemble a source file and write out a binary file",
  [
    new CLI.ValueOption(
      ["--output", "-o"],
      "The name of the binary file to write to",
    ),
  ],
  {
    name: "FileName",
    optional: false,
    help: "The name of the source file to assemble",
  },
  (
    _: CLI.Definition,
    file: string | undefined,
    vals: Map<string, unknown>,
  ) => {
    const outputFileName = (vals.get("output") === undefined)
      ? file!.endsWith(".bci") ? file!.replace(/\.bci$/, ".bin") : `${file}.bin`
      : vals.get("output") as string;

    writeBinary(outputFileName, asm(Deno.readTextFileSync(file!)));
  },
);

const disCmd = new CLI.ValueCommand(
  "dis",
  "Disassemble a bytecode file",
  [],
  {
    name: "FileName",
    optional: false,
    help: "The name of the bytecode file to disassemble",
  },
  (
    _: CLI.Definition,
    file: string | undefined,
    _vals: Map<string, unknown>,
  ) => {
    dis(readBinary(file!));
  },
);

const runCmd = new CLI.ValueCommand(
  "run",
  "Run a bytecode file",
  [
    new CLI.FlagOption(
      ["--debug", "-d"],
      "If enabled will display each instruction as it is executed.",
    ),
  ],
  {
    name: "FileName",
    optional: false,
    help: "The name of the bytecode file to run",
  },
  (
    _: CLI.Definition,
    file: string | undefined,
    _vals: Map<string, unknown>,
  ) => {
    execute(readBinary(file!), 0, { debug: _vals.get("debug") === true });
  },
);

const cli = {
  name: "bci",
  help: "Bytecode Interpreter for STLC",
  options: [CLI.helpFlag],
  cmds: [asmCmd, disCmd, runCmd, CLI.helpCmd],
};

CLI.process(cli);
