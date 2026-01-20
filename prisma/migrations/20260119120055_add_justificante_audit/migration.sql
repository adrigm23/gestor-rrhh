-- CreateEnum
CREATE TYPE "AccionJustificante" AS ENUM ('VER', 'BORRAR');

-- AlterTable
ALTER TABLE "Solicitud" ADD COLUMN     "justificanteMime" TEXT,
ADD COLUMN     "justificanteRuta" TEXT,
ADD COLUMN     "justificanteSize" INTEGER;

-- CreateTable
CREATE TABLE "JustificanteAcceso" (
    "id" TEXT NOT NULL,
    "solicitudId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "accion" "AccionJustificante" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JustificanteAcceso_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "JustificanteAcceso" ADD CONSTRAINT "JustificanteAcceso_solicitudId_fkey" FOREIGN KEY ("solicitudId") REFERENCES "Solicitud"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JustificanteAcceso" ADD CONSTRAINT "JustificanteAcceso_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
