import type { DirectoryEntry } from "../../../../../services/usuario";
import type { DirectoryEntryDto } from "@gestor-rrhh/shared";

export function toDirectoryEntryDto(entry: DirectoryEntry): DirectoryEntryDto {
  return {
    id: entry.id,
    nombre: entry.nombre,
    dni: entry.dni,
    email: entry.email,
    rol: entry.rol,
    activo: entry.activo,
    fechaBaja: entry.fechaBaja ? entry.fechaBaja.toISOString() : null,
    createdAt: entry.createdAt.toISOString(),
    hasNfc: entry.hasNfc,
    passwordMustChange: entry.passwordMustChange,
    empresaId: entry.empresaId,
    empresaNombre: entry.empresaNombre,
    departamentoNombre: entry.departamentoNombre,
    contratoHorasSemanales: entry.contratoHorasSemanales,
    contratoFechaInicio: entry.contratoFechaInicio ? entry.contratoFechaInicio.toISOString() : null,
  };
}
