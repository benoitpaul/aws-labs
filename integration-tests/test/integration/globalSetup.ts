import { STACK_NAME, writeEnvironmentVariables } from "../lib/write-env-vars";
import { config as loadEnv } from "dotenv";

export default async () => {
  console.log("Writing environment variables...");
  await writeEnvironmentVariables(STACK_NAME, ".env.integration");

  console.log("Loading environment variables...");
  loadEnv({ path: ".env.integration" });
};
