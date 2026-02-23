import { redirect } from "next/navigation";
import { auth } from "../../api/auth/auth";
import { prisma } from "../../lib/prisma";
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

  const [solicitudes, fichajes, historial, jornadaActiva] = userId
    ? await Promise.all([
        prisma.solicitud.findMany({
          where: {
            usuarioId: userId,
            OR: [
              { inicio: { gte: startRange, lte: endRange } },
              { fin: { gte: startRange, lte: endRange } },
              {
                AND: [
                  { inicio: { lte: startRange } },
                  { fin: { gte: endRange } },
                ],
              },
            ],
          },
          orderBy: { inicio: "asc" },
        }),
        prisma.fichaje.findMany({
          where: {
            usuarioId: userId,
            entrada: { gte: startRange, lte: endRange },
          },
          select: { entrada: true, salida: true },
        }),
        prisma.fichaje.findMany({
          where: {
            usuarioId: userId,
          },
          select: {
            id: true,
            entrada: true,
            salida: true,
            tipo: true,
            editado: true,
          },
          orderBy: { entrada: "desc" },
          take: 30,
        }),
        prisma.fichaje.findFirst({
          where: { usuarioId: userId, salida: null, tipo: "JORNADA" },
          orderBy: { entrada: "desc" },
        }),
      ])
    : [[], [], [], null];

  const pausaActiva =
    userId && jornadaActiva
      ? await prisma.fichaje.findFirst({
          where: {
            usuarioId: userId,
            salida: null,
            tipo: "PAUSA_COMIDA",
            entrada: { gte: jornadaActiva.entrada },
          },
          orderBy: { entrada: "desc" },
        })
      : null;

  const pausasCerradas =
    userId && jornadaActiva
      ? await prisma.fichaje.findMany({
          where: {
            usuarioId: userId,
            tipo: "PAUSA_COMIDA",
            entrada: { gte: jornadaActiva.entrada },
            salida: { not: null },
          },
          orderBy: { entrada: "asc" },
        })
      : [];

  const pauseAccumulatedMs = pausasCerradas.reduce((total, pausa) => {
    const end = pausa.salida ? pausa.salida.getTime() : pausa.entrada.getTime();
    return total + Math.max(0, end - pausa.entrada.getTime());
  }, 0);

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
      jornadaEntradaIso={jornadaActiva?.entrada.toISOString() ?? null}
      pauseStartIso={pausaActiva?.entrada.toISOString() ?? null}
      pauseAccumulatedMs={pauseAccumulatedMs}
      jornadaActiva={Boolean(jornadaActiva)}
      pausaActiva={Boolean(pausaActiva)}
    />
  );
}

