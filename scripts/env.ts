// Load .env.local for command-line scripts (Next.js loads it for the app).
import { config } from "dotenv";

config({ path: ".env.local" });
