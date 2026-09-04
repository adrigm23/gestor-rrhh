-- CreateEnum
CREATE TYPE "RevokedReason" AS ENUM ('LOGOUT', 'REUSE_DETECTED', 'ADMIN_REVOKE_ALL', 'EXPIRED');

-- AlterTable
ALTER TABLE "MobileSession" ADD COLUMN     "currentTokenIssuedAt" TIMESTAMP(3),
ADD COLUMN     "revokedReason" "RevokedReason";

-- CreateTable
CREATE TABLE "MobileSessionTokenHistory" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MobileSessionTokenHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MobileSessionTokenHistory_tokenHash_key" ON "MobileSessionTokenHistory"("tokenHash");

-- CreateIndex
CREATE INDEX "MobileSessionTokenHistory_sessionId_idx" ON "MobileSessionTokenHistory"("sessionId");

-- AddForeignKey
ALTER TABLE "MobileSessionTokenHistory" ADD CONSTRAINT "MobileSessionTokenHistory_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "MobileSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
