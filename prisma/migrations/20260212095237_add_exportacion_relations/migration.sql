-- CreateEnum
CREATE TYPE "TipoExportacion" AS ENUM ('FICHAJES', 'FICHAJES_EMPRESAS');

-- CreateEnum
CREATE TYPE "EstadoExportacion" AS ENUM ('PENDIENTE', 'GENERANDO', 'LISTO', 'ERROR');

-- AlterTable
ALTER TABLE "Empresa" ADD COLUMN     "pausaCuentaComoTrabajo" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "Contrato" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "horasSemanales" DOUBLE PRECISION NOT NULL,
    "fechaInicio" TIMESTAMP(3) NOT NULL,
    "fechaFin" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Contrato_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Exportacion" (
    "id" TEXT NOT NULL,
    "tipo" "TipoExportacion" NOT NULL,
    "estado" "EstadoExportacion" NOT NULL DEFAULT 'PENDIENTE',
    "solicitadoPorId" TEXT NOT NULL,
    "empresaId" TEXT,
    "empleadoId" TEXT,
    "filtros" JSONB,
    "archivoRuta" TEXT,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Exportacion_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Contrato" ADD CONSTRAINT "Contrato_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exportacion" ADD CONSTRAINT "Exportacion_solicitadoPorId_fkey" FOREIGN KEY ("solicitadoPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
