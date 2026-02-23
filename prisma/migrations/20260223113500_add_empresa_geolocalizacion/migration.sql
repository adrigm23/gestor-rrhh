-- Add company-level geolocation setting
ALTER TABLE "Empresa"
  ADD COLUMN IF NOT EXISTS "geolocalizacionFichaje" BOOLEAN NOT NULL DEFAULT false;
