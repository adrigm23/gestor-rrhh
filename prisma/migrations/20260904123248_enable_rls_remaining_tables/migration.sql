-- Auditoría de seguridad (Fase 2.19, hallazgo #6): solo MobileSession,
-- MobileSessionTokenHistory y LoginThrottle tenían RLS habilitado. El resto
-- de tablas dependía al 100% del aislamiento a nivel de aplicación (correcto
-- en todo lo revisado, pero sin red de seguridad en la BD frente a la Data
-- API de Supabase/PostgREST).
--
-- Esto es "deny-all" (ENABLE ROW LEVEL SECURITY sin ninguna CREATE POLICY):
-- para los roles de PostgREST (anon/authenticated) estas tablas pasan a
-- devolver cero filas. NO afecta a Prisma/la app: la connection string usa
-- el rol "postgres" del pooler de Supabase, que tiene BYPASSRLS y por tanto
-- ignora estas políticas por completo — mismo patrón ya aplicado y probado
-- en las dos migraciones RLS anteriores.
ALTER TABLE "Empresa" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Usuario" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Fichaje" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Solicitud" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SolicitudModificacionFichaje" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PasswordResetToken" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "JustificanteAcceso" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Contrato" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Exportacion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DbUsageAlert" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Departamento" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CentroTrabajo" ENABLE ROW LEVEL SECURITY;
