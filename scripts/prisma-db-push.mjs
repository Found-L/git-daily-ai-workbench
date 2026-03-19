import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const DEFAULT_DATABASE_URL = "file:./dev.db";
const LEGACY_DATABASE_URL = "file:./prisma/dev.db";

const prismaCli = require.resolve("prisma/build/index.js");
const databaseUrl =
  process.env.DATABASE_URL === LEGACY_DATABASE_URL
    ? DEFAULT_DATABASE_URL
    : process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL;

const result = spawnSync(
  process.execPath,
  [prismaCli, "db", "push", "--skip-generate", "--schema", "prisma/schema.prisma"],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
    },
  },
);

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);
