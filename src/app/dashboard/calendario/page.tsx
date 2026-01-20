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

  const solicitudes = userId
    ? await prisma.solicitud.findMany({
        where: { usuarioId: userId },
        orderBy: { createdAt: "desc" },
        take: 8,
      })
    : [];

  const resumen: SolicitudResumen[] = solicitudes.map((item) => ({
    id: item.id,
    tipo: item.tipo,
    estado: item.estado,
    inicio: item.inicio.toISOString(),
    fin: item.fin ? item.fin.toISOString() : null,
    createdAt: item.createdAt.toISOString(),
    motivo: item.motivo ?? null,
  }));

  return <CalendarioEmpleado solicitudes={resumen} />;
}
