import { config as loadEnv } from "dotenv";

console.log("Loading environment variables...");
loadEnv({ path: ".env.integration" });
