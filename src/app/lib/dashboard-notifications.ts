import "server-only";

import { prisma } from "../lib/prisma";
import type { DashboardNotificationSummary } from "../dashboard/notification-types";

const emptySummary: DashboardNotificationSummary = {
  total: 0,
  items: [],
};

export async function getDashboardNotificationSummary(
  userId: string,
  role?: string | null,
): Promise<DashboardNotificationSummary> {
  if (!userId || role !== "EMPLEADO") {
    return emptySummary;
  }

  const [total, solicitudes] = await Promise.all([
    prisma.solicitudModificacionFichaje.count({
      where: { empleadoId: userId, estado: "PENDIENTE" },
    }),
    prisma.solicitudModificacionFichaje.findMany({
      where: { empleadoId: userId, estado: "PENDIENTE" },
      include: {
        solicitante: {
          select: { nombre: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  return {
    total,
    items: solicitudes.map((solicitud) => ({
      id: solicitud.id,
      title: "Solicitud de modificacion de fichaje",
      description: `${solicitud.solicitante.nombre} te ha enviado una solicitud pendiente.`,
      href: "/dashboard#solicitudes-fichaje",
      createdAt: solicitud.createdAt.toISOString(),
    })),
  };
}
