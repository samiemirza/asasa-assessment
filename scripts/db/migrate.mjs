// Applies db/migrations/*.sql in order against DATABASE_URL_UNPOOLED (direct Neon host).
// Usage: node scripts/db/migrate.mjs [--reset]
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

function loadEnv() {
  const file = resolve(root, ".env");
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
  }
}
loadEnv();

const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL_UNPOOLED (or DATABASE_URL) is required");
  process.exit(1);
}

const client = new pg.Client({ connectionString: url });
await client.connect();
try {
  if (process.argv.includes("--reset")) {
    await client.query("select reset_demo()");
    console.log("demo reset: balances seeded, trades cleared, settings defaulted");
  } else {
    await client.query(
      "create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())"
    );
    const dir = resolve(root, "db/migrations");
    const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
    for (const name of files) {
      const { rowCount } = await client.query("select 1 from schema_migrations where name = $1", [name]);
      if (rowCount) { console.log(`skip  ${name}`); continue; }
      const sql = readFileSync(resolve(dir, name), "utf8");
      await client.query("begin");
      try {
        await client.query(sql);
        await client.query("insert into schema_migrations (name) values ($1)", [name]);
        await client.query("commit");
        console.log(`apply ${name}`);
      } catch (e) {
        await client.query("rollback");
        throw e;
      }
    }
  }
  const { rows } = await client.query("select pkr, customer_gold_g, inventory_gold_g from balances where id = 1");
  console.log("balances:", rows[0]);
} finally {
  await client.end();
}
