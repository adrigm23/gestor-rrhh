import { EstadoSolicitud, Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import { auth } from "../../api/auth/auth";
import { prisma } from "../../lib/prisma";
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

  const gerenteEmpresaId =
    role === "GERENTE"
      ? (
          await prisma.usuario.findUnique({
            where: { id: session.user?.id ?? "" },
            select: { empresaId: true },
          })
        )?.empresaId ?? null
      : null;

  const wherePendientes: Prisma.SolicitudWhereInput =
    role === "ADMIN_SISTEMA"
      ? { estado: EstadoSolicitud.PENDIENTE }
      : gerenteEmpresaId
        ? {
            estado: EstadoSolicitud.PENDIENTE,
            usuario: { empresaId: gerenteEmpresaId },
          }
        : { estado: EstadoSolicitud.PENDIENTE, usuarioId: "__none__" };

  type SolicitudConUsuario = Prisma.SolicitudGetPayload<{
    include: {
      usuario: {
        select: {
          nombre: true;
          email: true;
        };
      };
    };
  }>;

  const historicoEstados = [
    EstadoSolicitud.APROBADA,
    EstadoSolicitud.RECHAZADA,
    EstadoSolicitud.ANULADA,
  ];

  const whereHistorico: Prisma.SolicitudWhereInput =
    role === "ADMIN_SISTEMA"
      ? { estado: { in: historicoEstados } }
      : gerenteEmpresaId
        ? {
            estado: { in: historicoEstados },
            usuario: { empresaId: gerenteEmpresaId },
          }
        : { estado: EstadoSolicitud.APROBADA, usuarioId: "__none__" };

  const [solicitudesPendientes, solicitudesHistorico]: [
    SolicitudConUsuario[],
    SolicitudConUsuario[],
  ] = await Promise.all([
    prisma.solicitud.findMany({
      where: wherePendientes,
      include: {
        usuario: {
          select: { nombre: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    prisma.solicitud.findMany({
      where: whereHistorico,
      include: {
        usuario: {
          select: { nombre: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  const pendientes: SolicitudPendiente[] = solicitudesPendientes.map((item) => ({
    id: item.id,
    tipo: item.tipo,
    inicio: item.inicio.toISOString(),
    fin: item.fin ? item.fin.toISOString() : null,
    motivo: item.motivo ?? null,
    ausenciaTipo: item.ausenciaTipo ?? null,
    justificanteNombre: item.justificanteNombre ?? null,
    justificanteRuta: item.justificanteRuta ?? null,
    usuarioNombre: item.usuario.nombre,
    usuarioEmail: item.usuario.email,
  }));

  const historico: SolicitudHistorial[] = solicitudesHistorico.map((item) => ({
    id: item.id,
    tipo: item.tipo,
    inicio: item.inicio.toISOString(),
    fin: item.fin ? item.fin.toISOString() : null,
    motivo: item.motivo ?? null,
    ausenciaTipo: item.ausenciaTipo ?? null,
    estado: item.estado,
    usuarioNombre: item.usuario.nombre,
    usuarioEmail: item.usuario.email,
  }));

  return <SolicitudesPanel solicitudes={pendientes} historico={historico} />;
}

