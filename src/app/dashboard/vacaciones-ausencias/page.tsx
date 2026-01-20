import { redirect } from "next/navigation";
import { auth } from "../../api/auth/auth";
import { prisma } from "../../lib/prisma";
import SolicitudesPanel, {
  type SolicitudPendiente,
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

  const whereClause =
    role === "ADMIN_SISTEMA"
      ? { estado: "PENDIENTE" }
      : gerenteEmpresaId
        ? {
            estado: "PENDIENTE",
            usuario: { empresaId: gerenteEmpresaId },
          }
        : { estado: "PENDIENTE", usuarioId: "__none__" };

  const solicitudes = await prisma.solicitud.findMany({
    where: whereClause,
    include: {
      usuario: {
        select: { nombre: true, email: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  const pendientes: SolicitudPendiente[] = solicitudes.map((item) => ({
    id: item.id,
    tipo: item.tipo,
    inicio: item.inicio.toISOString(),
    fin: item.fin ? item.fin.toISOString() : null,
    motivo: item.motivo ?? null,
    justificanteNombre: item.justificanteNombre ?? null,
    justificanteRuta: item.justificanteRuta ?? null,
    usuarioNombre: item.usuario.nombre,
    usuarioEmail: item.usuario.email,
  }));

  return <SolicitudesPanel solicitudes={pendientes} />;
}
