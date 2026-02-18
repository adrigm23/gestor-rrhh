-- Add ANULADA state to EstadoSolicitud enum
DO $$ BEGIN
  ALTER TYPE "EstadoSolicitud" ADD VALUE IF NOT EXISTS 'ANULADA';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
