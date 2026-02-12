-- CreateTable
CREATE TABLE "DbUsageAlert" (
    "id" TEXT NOT NULL,
    "lastLevel" TEXT,
    "lastSizeMb" DOUBLE PRECISION,
    "lastNotifiedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DbUsageAlert_pkey" PRIMARY KEY ("id")
);
