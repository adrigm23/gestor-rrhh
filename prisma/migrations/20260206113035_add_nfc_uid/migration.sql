/*
  Warnings:

  - A unique constraint covering the columns `[nfcUidHash]` on the table `Usuario` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN     "nfcUidHash" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_nfcUidHash_key" ON "Usuario"("nfcUidHash");
