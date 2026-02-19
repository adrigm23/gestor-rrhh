// src/lib/prisma.ts
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const connectionString = `${process.env.DATABASE_URL}`;
const poolMaxRaw = process.env.PG_POOL_MAX;
const poolMax =
  poolMaxRaw && Number.isFinite(Number(poolMaxRaw))
    ? Number(poolMaxRaw)
    : process.env.NODE_ENV === "production"
      ? 1
      : 10;
const pool = new Pool({
  connectionString,
  max: poolMax,
  idleTimeoutMillis: 10_000,
  connectionTimeoutMillis: 2_000,
});
const adapter = new PrismaPg(pool);

const globalForPrisma = global as unknown as { prisma: PrismaClient };

// Exportamos una única instancia configurada con el adaptador para Supabase
export const prisma = globalForPrisma.prisma || new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
