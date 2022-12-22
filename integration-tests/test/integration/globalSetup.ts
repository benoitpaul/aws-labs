import { STACK_NAME, writeEnvironmentVariables } from "../lib/write-env-vars";

export default async () => {
  console.log("Writing environment variables...");
  await writeEnvironmentVariables(STACK_NAME, ".env.integration");
};
