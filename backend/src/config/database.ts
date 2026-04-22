import { PrismaClient } from "@prisma/client";
import { env } from "./env";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasourceUrl: env.DATABASE_URL,
    log:
      env.NODE_ENV === "development"
        ? [
            { level: "query", emit: "stdout" },
            { level: "warn", emit: "stdout" },
            { level: "error", emit: "stdout" },
          ]
        : [{ level: "error", emit: "stdout" }],
  });

if (env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

/**
 * Gracefully disconnect Prisma on process termination.
 */
async function shutdown() {
  await prisma.$disconnect();
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
