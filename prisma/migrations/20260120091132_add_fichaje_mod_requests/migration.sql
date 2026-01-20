-- CreateEnum
CREATE TYPE "EstadoSolicitudFichaje" AS ENUM ('PENDIENTE', 'ACEPTADA', 'RECHAZADA');

-- CreateTable
CREATE TABLE "SolicitudModificacionFichaje" (
    "id" TEXT NOT NULL,
    "empleadoId" TEXT NOT NULL,
    "solicitanteId" TEXT NOT NULL,
    "respondidoPorId" TEXT,
    "fichajeId" TEXT,
    "entradaPropuesta" TIMESTAMP(3),
    "salidaPropuesta" TIMESTAMP(3),
    "motivo" TEXT,
    "estado" "EstadoSolicitudFichaje" NOT NULL DEFAULT 'PENDIENTE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "SolicitudModificacionFichaje_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "SolicitudModificacionFichaje" ADD CONSTRAINT "SolicitudModificacionFichaje_empleadoId_fkey" FOREIGN KEY ("empleadoId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolicitudModificacionFichaje" ADD CONSTRAINT "SolicitudModificacionFichaje_solicitanteId_fkey" FOREIGN KEY ("solicitanteId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolicitudModificacionFichaje" ADD CONSTRAINT "SolicitudModificacionFichaje_respondidoPorId_fkey" FOREIGN KEY ("respondidoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolicitudModificacionFichaje" ADD CONSTRAINT "SolicitudModificacionFichaje_fichajeId_fkey" FOREIGN KEY ("fichajeId") REFERENCES "Fichaje"("id") ON DELETE SET NULL ON UPDATE CASCADE;
