import "./env";
import { migrateDb } from "@/db/client";

migrateDb()
  .then(() => console.log("Database migrated."))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
