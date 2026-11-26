import { ensureTables, sqlite } from "./index";

function main() {
  ensureTables();
  const tables = sqlite
    .prepare(
      `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name;`
    )
    .all() as Array<{ name: string }>;

  console.log("Database migration complete. Tables:");
  for (const t of tables) {
    console.log(`  - ${t.name}`);
  }
}

main();
