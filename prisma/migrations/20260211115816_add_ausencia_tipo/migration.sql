-- CreateEnum
CREATE TYPE "TipoAusencia" AS ENUM ('FALTA', 'AVISO');

-- AlterTable
ALTER TABLE "Solicitud" ADD COLUMN     "ausenciaTipo" "TipoAusencia";
