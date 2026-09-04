import { redirect } from "next/navigation";
import { auth } from "../../api/auth/auth";
import { fichajeService } from "../../../services/fichaje";
import { calendarioService } from "../../../services/calendario";
import CalendarioEmpleado, {
  type FichajeHistorial,
  type SolicitudResumen,
} from "./calendar-employee";

export default async function CalendarioPage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  const userId = session.user?.id;
  const today = new Date();
  const startRange = new Date(today.getFullYear(), today.getMonth() - 3, 1);
  const endRange = new Date(today.getFullYear(), today.getMonth() + 4, 0, 23, 59, 59, 999);

  const [{ solicitudes, fichajes }, historial, status] = userId
    ? await Promise.all([
        calendarioService.getRango(userId, startRange, endRange),
        fichajeService.listHistory(userId, 30),
        fichajeService.getStatus(userId),
      ])
    : [{ solicitudes: [], fichajes: [] }, [], null];

  const resumen: SolicitudResumen[] = solicitudes.map((item) => ({
    id: item.id,
    tipo: item.tipo,
    estado: item.estado,
    inicio: item.inicio.toISOString(),
    fin: item.fin ? item.fin.toISOString() : null,
    createdAt: item.createdAt.toISOString(),
    motivo: item.motivo ?? null,
    ausenciaTipo: item.ausenciaTipo ?? null,
  }));

  const fichajesResumen = fichajes.map((item) => ({
    entrada: item.entrada.toISOString(),
    salida: item.salida ? item.salida.toISOString() : null,
  }));

  const historialResumen: FichajeHistorial[] = historial.map((item) => ({
    id: item.id,
    entrada: item.entrada.toISOString(),
    salida: item.salida ? item.salida.toISOString() : null,
    tipo: item.tipo,
    editado: item.editado,
  }));

  return (
    <CalendarioEmpleado
      solicitudes={resumen}
      fichajes={fichajesResumen}
      historial={historialResumen}
      jornadaEntradaIso={status?.shift?.entrada.toISOString() ?? null}
      pauseStartIso={status?.pause?.entrada.toISOString() ?? null}
      pauseAccumulatedMs={status?.pauseAccumulatedMs ?? 0}
      jornadaActiva={Boolean(status?.shift)}
      pausaActiva={Boolean(status?.pause)}
    />
  );
}
