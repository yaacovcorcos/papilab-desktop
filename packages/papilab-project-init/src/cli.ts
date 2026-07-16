#!/usr/bin/env bun

import {
  applyProjectInitialization,
  inspectProjectFolder,
  planProjectInitialization,
  recoverProjectInitialization,
  rollbackProjectInitialization,
} from "./index.ts";

function usage(): never {
  console.error(
    "Usage: bun src/cli.ts <inspect|plan|apply|recover|rollback> <folder> [--title <title>]",
  );
  process.exit(2);
}

function titleFromArgs(args: readonly string[]): string | undefined {
  const titleIndex = args.indexOf("--title");
  if (titleIndex < 0) return undefined;
  const title = args[titleIndex + 1];
  if (!title) usage();
  return title;
}

async function main(): Promise<void> {
  const [, , command, folder, ...args] = process.argv;
  if (!command || !folder) usage();
  if (command === "inspect") {
    console.log(JSON.stringify(await inspectProjectFolder(folder), null, 2));
    return;
  }
  if (command === "recover") {
    console.log(JSON.stringify(await recoverProjectInitialization(folder), null, 2));
    return;
  }
  if (command === "rollback") {
    console.log(JSON.stringify(await rollbackProjectInitialization(folder), null, 2));
    return;
  }
  if (command === "plan" || command === "apply") {
    const inspection = await inspectProjectFolder(folder);
    const title = titleFromArgs(args);
    const plan = await planProjectInitialization({
      inspection,
      request: title === undefined ? {} : { title },
    });
    if (command === "plan") {
      console.log(JSON.stringify(plan, null, 2));
      return;
    }
    console.log(JSON.stringify(await applyProjectInitialization(plan), null, 2));
    return;
  }
  usage();
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exitCode = 1;
});
