-- Add exit geolocation fields for fichajes
ALTER TABLE "Fichaje"
  ADD COLUMN IF NOT EXISTS "latitudSalida" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "longitudSalida" DOUBLE PRECISION;
