import { mkdirSync } from "node:fs";

import { PrismaClient } from "@prisma/client";
import { DATABASE_DIR, DATABASE_URL } from "@/lib/paths";

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
};

mkdirSync(DATABASE_DIR, { recursive: true });
process.env.DATABASE_URL = DATABASE_URL;

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
