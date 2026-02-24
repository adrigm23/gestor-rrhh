-- Add address to work centers
ALTER TABLE "CentroTrabajo"
  ADD COLUMN IF NOT EXISTS "direccion" TEXT;
