import type { FichajeEntry, FichajeStatus } from "../../../../../services/fichaje";
import type { FichajeEntryDto, ClockStatusDto } from "@gestor-rrhh/shared";

export function serializeFichajeEntry(entry: FichajeEntry): FichajeEntryDto {
  return {
    id: entry.id,
    tipo: entry.tipo,
    entrada: entry.entrada.toISOString(),
    salida: entry.salida ? entry.salida.toISOString() : null,
  };
}

export function serializeFichajeStatus(status: FichajeStatus): ClockStatusDto {
  return {
    shift: status.shift ? serializeFichajeEntry(status.shift) : null,
    pause: status.pause ? serializeFichajeEntry(status.pause) : null,
    blockedByLeave: status.blockedByLeave,
    pauseAccumulatedMs: status.pauseAccumulatedMs,
  };
}
