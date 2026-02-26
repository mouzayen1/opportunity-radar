import * as fs from "fs";
import * as path from "path";
import postgres from "postgres";

/**
 * Splits SQL respecting $$ delimited function bodies.
 */
function splitStatements(sql: string): string[] {
  const results: string[] = [];
  let current = "";
  let inDollarBlock = false;

  const lines = sql.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("--") && !inDollarBlock) continue;

    const dollarCount = (line.match(/\$\$/g) || []).length;
    if (dollarCount % 2 === 1) inDollarBlock = !inDollarBlock;

    current += line + "\n";

    if (!inDollarBlock && trimmed.endsWith(";")) {
      const stmt = current.trim();
      if (stmt.length > 5) results.push(stmt);
      current = "";
    }
  }

  const remaining = current.trim();
  if (remaining.length > 5) results.push(remaining);
  return results;
}

async function runMigration() {
  const dbUrl = process.env.DATABASE_URL || process.env.DIRECT_URL;
  if (!dbUrl) {
    console.error("Set DATABASE_URL or DIRECT_URL environment variable.");
    process.exit(1);
  }

  const sql = postgres(dbUrl, { ssl: "require" });

  const migrationPath = path.join(
    __dirname,
    "../supabase/migrations/001_initial_schema.sql"
  );
  const migration = fs.readFileSync(migrationPath, "utf-8");

  console.log("Running PainRadar migration...");

  try {
    const result = await sql`SELECT 1 as ok`;
    console.log("Connected!\n");
  } catch (err: any) {
    console.error("Connection failed:", err.message);
    await sql.end();
    return;
  }

  const statements = splitStatements(migration);
  console.log(`Found ${statements.length} statements.\n`);

  let ok = 0, skipped = 0, failed = 0;

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    const label = stmt.substring(0, 80).replace(/\n/g, " ");
    try {
      await sql.unsafe(stmt);
      console.log(`  [${i + 1}] OK: ${label}`);
      ok++;
    } catch (err: any) {
      if (err.message?.includes("already exists")) {
        console.log(`  [${i + 1}] SKIP: ${label}`);
        skipped++;
      } else {
        console.error(`  [${i + 1}] FAIL: ${label}`);
        console.error(`    ${err.message}`);
        failed++;
      }
    }
  }

  await sql.end();
  console.log(`\nDone! ${ok} ok, ${skipped} skipped, ${failed} failed.`);
}

runMigration();
