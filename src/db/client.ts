import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import * as schema from "./schema";

// libSQL speaks to a local SQLite file (DATABASE_URL=file:./encore.db) and to a
// hosted Turso database at deploy, with the same code.

export type Db = ReturnType<typeof createDb>;

export function createDb(
  url = process.env.DATABASE_URL ?? "file:./encore.db",
  authToken = process.env.DATABASE_AUTH_TOKEN,
) {
  return drizzle(createClient({ url, authToken }), { schema });
}

let db: Db | undefined;

/** Shared database handle for the app and scripts. */
export function getDb(): Db {
  return (db ??= createDb());
}

export async function migrateDb(target: Db = getDb()) {
  await migrate(target, { migrationsFolder: "drizzle" });
}
