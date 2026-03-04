ALTER TABLE "Usuario"
ADD COLUMN "dni" TEXT;

CREATE UNIQUE INDEX "Usuario_dni_key" ON "Usuario"("dni");
