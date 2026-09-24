import { runEvalCli } from "../apps/web/scripts/run-eval";

void runEvalCli().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
