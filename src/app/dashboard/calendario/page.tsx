import { redirect } from "next/navigation";
import { auth } from "../../api/auth/auth";
import { prisma } from "../../lib/prisma";
import CalendarioEmpleado, {
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

  const [solicitudes, fichajes] = userId
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
          select: { entrada: true },
        }),
      ])
    : [[], []];

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

  const fichajesResumen = fichajes.map((item) => item.entrada.toISOString());

  return <CalendarioEmpleado solicitudes={resumen} fichajes={fichajesResumen} />;
}

