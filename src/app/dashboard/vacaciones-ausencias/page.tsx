import { redirect } from "next/navigation";
import { auth } from "../../api/auth/auth";
import { solicitudService } from "../../../services/solicitud";
import SolicitudesPanel, {
  type SolicitudPendiente,
  type SolicitudHistorial,
} from "./solicitudes-panel";

export default async function VacacionesAusenciasPage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  if (session.user?.role === "EMPLEADO") {
    redirect("/dashboard");
  }

  const role = session.user?.role;
  if (role !== "GERENTE" && role !== "ADMIN_SISTEMA") {
    redirect("/dashboard");
  }

  const userId = session.user?.id ?? "";

  const [solicitudesPendientes, solicitudesHistorico] = await Promise.all([
    solicitudService.listPendingForManager(userId, role, 30),
    solicitudService.listHistoryForManager(userId, role, 10),
  ]);

  const pendientes: SolicitudPendiente[] = solicitudesPendientes.map((item) => ({
    id: item.id,
    tipo: item.tipo,
    inicio: item.inicio.toISOString(),
    fin: item.fin ? item.fin.toISOString() : null,
    motivo: item.motivo ?? null,
    ausenciaTipo: item.ausenciaTipo ?? null,
    justificanteNombre: item.justificanteNombre,
    justificanteRuta: item.justificanteRuta,
    usuarioNombre: item.usuarioNombre,
    usuarioEmail: item.usuarioEmail,
  }));

  const historico: SolicitudHistorial[] = solicitudesHistorico.map((item) => ({
    id: item.id,
    tipo: item.tipo,
    inicio: item.inicio.toISOString(),
    fin: item.fin ? item.fin.toISOString() : null,
    motivo: item.motivo ?? null,
    ausenciaTipo: item.ausenciaTipo ?? null,
    estado: item.estado,
    usuarioNombre: item.usuarioNombre,
    usuarioEmail: item.usuarioEmail,
  }));

  return <SolicitudesPanel solicitudes={pendientes} historico={historico} />;
}

