// src/app/dashboard/page.tsx
import { auth } from "../api/auth/auth";
import { redirect } from "next/navigation";
import { prisma } from "../lib/prisma";
import { toggleFichaje, togglePausa } from "../actions/fichaje-actions";
import { Play, Pause, Clock } from "lucide-react";
import FichajeTimer from "./fichaje-timer";
import PausaTimer from "./pausa-timer";
import SolicitudesFichajeEmpleado, {
  type SolicitudFichajeEmpleado,
} from "./solicitudes-fichaje-empleado";

export default async function DashboardPage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  const role = session.user?.role;
  const userId = session.user?.id;

  if (role === "ADMIN_SISTEMA") {
    redirect("/dashboard/empleados");
  }

  const hoy = new Date().toLocaleDateString("es-ES", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const jornadaActiva = userId
    ? await prisma.fichaje.findFirst({
        where: { usuarioId: userId, salida: null, tipo: "JORNADA" },
        orderBy: { entrada: "desc" },
      })
    : null;

  const entradaIso = jornadaActiva?.entrada
    ? jornadaActiva.entrada.toISOString()
    : null;

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

  const pauseStartIso = pausaActiva?.entrada
    ? pausaActiva.entrada.toISOString()
    : null;

  const solicitudesFichaje: SolicitudFichajeEmpleado[] =
    role === "EMPLEADO" && userId
      ? (
          await prisma.solicitudModificacionFichaje.findMany({
            where: { empleadoId: userId, estado: "PENDIENTE" },
            include: {
              solicitante: { select: { nombre: true, email: true } },
              fichaje: { select: { entrada: true, salida: true } },
            },
            orderBy: { createdAt: "desc" },
            take: 10,
          })
        ).map((item) => ({
          id: item.id,
          solicitanteNombre: item.solicitante.nombre,
          solicitanteEmail: item.solicitante.email,
          fichajeEntrada: item.fichaje?.entrada
            ? item.fichaje.entrada.toISOString()
            : null,
          fichajeSalida: item.fichaje?.salida
            ? item.fichaje.salida.toISOString()
            : null,
          entradaPropuesta: item.entradaPropuesta
            ? item.entradaPropuesta.toISOString()
            : null,
          salidaPropuesta: item.salidaPropuesta
            ? item.salidaPropuesta.toISOString()
            : null,
          motivo: item.motivo ?? null,
          createdAt: item.createdAt.toISOString(),
        }))
      : [];

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-sky-500/70">
          Fichaje
        </p>
        <h2 className="text-3xl font-semibold text-slate-900">Fichaje</h2>
      </header>

      <section className="rounded-[2.75rem] border border-slate-100 bg-white p-8 shadow-[0_24px_80px_rgba(15,23,42,0.12)]">
        <p className="text-sm font-semibold capitalize text-slate-600">{hoy}</p>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-[0_16px_50px_rgba(148,163,184,0.14)]">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <Clock size={14} className="text-slate-400" />
              Tiempo trabajado
            </div>
            <FichajeTimer
              startIso={entradaIso}
              pauseAccumulatedMs={pauseAccumulatedMs}
              pauseStartIso={pauseStartIso}
              className="mt-3 block text-3xl font-semibold text-slate-800"
            />
          </div>
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-[0_16px_50px_rgba(148,163,184,0.12)]">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <Clock size={14} className="text-slate-400" />
              Tiempo pausado
            </div>
            <PausaTimer
              pauseAccumulatedMs={pauseAccumulatedMs}
              pauseStartIso={pauseStartIso}
              className="mt-3 block text-3xl font-semibold text-slate-500"
            />
          </div>
        </div>

        {jornadaActiva ? (
          <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-2">
            <form action={togglePausa}>
              <button
                className={`flex w-full items-center justify-center gap-2 rounded-full py-5 text-lg font-semibold text-white shadow-2xl transition ${
                  pausaActiva
                    ? "bg-amber-500 hover:bg-amber-600 shadow-amber-200/70"
                    : "bg-teal-500 hover:bg-teal-600 shadow-teal-200/70"
                }`}
              >
                {pausaActiva ? <Play size={18} /> : <Pause size={18} />}
                {pausaActiva ? "Reanudar" : "Pausa"}
              </button>
            </form>
            <form action={toggleFichaje}>
              <button className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-purple-500 via-indigo-500 to-indigo-600 py-5 text-lg font-semibold text-white shadow-2xl shadow-indigo-200/80 transition hover:brightness-110">
                <Play size={18} className="rotate-180" />
                Salir
              </button>
            </form>
          </div>
        ) : (
          <form action={toggleFichaje} className="mt-10">
            <button className="w-full rounded-full bg-gradient-to-r from-teal-500 via-sky-500 to-sky-600 py-5 text-lg font-semibold text-white shadow-2xl shadow-sky-200/80 transition hover:brightness-110">
              Registrar entrada
            </button>
          </form>
        )}
      </section>

      {role === "EMPLEADO" && (
        <SolicitudesFichajeEmpleado solicitudes={solicitudesFichaje} />
      )}

    </div>
  );
}

