// src/app/dashboard/page.tsx
import { auth } from "../api/auth/auth";
import { redirect } from "next/navigation";
import { prisma } from "../lib/prisma";
import { crearGerente } from "../actions/admin-actions";
import { toggleFichaje } from "../actions/fichaje-actions";
import {
  Play,
  Pause,
  Clock,
  ShieldCheck,
  UserPlus,
  Activity,
} from "lucide-react";
import FichajeTimer from "./fichaje-timer";
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
    const empresas = await prisma.empresa.findMany();

    return (
      <div className="relative overflow-hidden rounded-[2.5rem] bg-slate-950 px-6 py-10 text-slate-100 shadow-2xl shadow-slate-900/40 sm:px-10">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-32 top-0 h-80 w-80 rounded-full bg-indigo-600/20 blur-[120px]" />
          <div className="absolute -right-20 bottom-0 h-72 w-72 rounded-full bg-purple-500/20 blur-[110px]" />
        </div>

        <div className="relative space-y-10">
          <header className="flex flex-col gap-5 border-b border-white/10 pb-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/20 text-indigo-200 ring-1 ring-indigo-400/30">
                <ShieldCheck size={26} />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-200/70">
                  SD OnTime
                </p>
                <h1 className="text-2xl font-semibold text-white sm:text-3xl">
                  Panel de Control Global
                </h1>
                <p className="text-sm text-slate-300">Gestionando SD OnTime</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-slate-200">
              <Activity size={16} className="text-emerald-300" />
              Conectado a Supabase
            </div>
          </header>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            <section className="lg:col-span-2 rounded-[2rem] bg-white p-8 text-slate-900 shadow-[0_20px_80px_rgba(15,23,42,0.18)]">
              <div className="flex items-center gap-3">
                <UserPlus className="text-purple-600" />
                <h2 className="text-xl font-semibold text-slate-900">
                  Alta de Nuevo Gerente
                </h2>
              </div>
              <p className="mt-2 text-sm text-slate-500">
                Crea credenciales y asigna la empresa correspondiente.
              </p>

              <form
                action={crearGerente}
                className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2"
              >
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Nombre completo
                  </label>
                  <input
                    name="nombre"
                    type="text"
                    required
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-300 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-300"
                    placeholder="Ej: Juan Perez"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Email
                  </label>
                  <input
                    name="email"
                    type="email"
                    required
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-300 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-300"
                    placeholder="gerente@empresa.com"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Contrasena
                  </label>
                  <input
                    name="password"
                    type="password"
                    required
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-300 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-300"
                    placeholder="********"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Empresa
                  </label>
                  <select
                    name="empresaId"
                    required
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-300"
                  >
                    <option value="">Selecciona una empresa...</option>
                    {empresas.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2 pt-2">
                  <button
                    type="submit"
                    className="w-full rounded-2xl bg-gradient-to-r from-purple-500 via-indigo-500 to-indigo-600 py-4 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:brightness-110"
                  >
                    Registrar Gerente
                  </button>
                </div>
              </form>
            </section>

            <aside className="flex flex-col justify-between rounded-[2rem] bg-gradient-to-br from-indigo-800 via-indigo-900 to-slate-900 p-8 shadow-[0_20px_80px_rgba(15,23,42,0.4)]">
              <div>
                <Activity className="mb-6 text-emerald-300" size={40} />
                <h2 className="text-lg font-semibold text-white">
                  Conectado a Supabase
                </h2>
                <p className="mt-1 text-sm text-indigo-200/80">
                  Empresas en sistema: {empresas.length}
                </p>
              </div>
              <div className="mt-10 text-4xl font-black uppercase tracking-[0.2em] text-white/20">
                Online
              </div>
            </aside>
          </div>
        </div>
      </div>
    );
  }

  const hoy = new Date().toLocaleDateString("es-ES", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const ultimoFichaje = userId
    ? await prisma.fichaje.findFirst({
        where: { usuarioId: userId, salida: null },
        orderBy: { entrada: "desc" },
      })
    : null;

  const entradaIso = ultimoFichaje?.entrada
    ? ultimoFichaje.entrada.toISOString()
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
        <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-indigo-500/70">
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
              className="mt-3 block text-3xl font-semibold text-slate-800"
            />
          </div>
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-[0_16px_50px_rgba(148,163,184,0.12)]">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <Clock size={14} className="text-slate-400" />
              Tiempo pausado
            </div>
            <p className="mt-3 text-3xl font-semibold text-slate-500">00:00 Hrs</p>
          </div>
        </div>

        <form action={toggleFichaje} className="mt-10">
          <button
            className={`w-full rounded-full py-5 text-lg font-semibold text-white shadow-2xl transition ${
              ultimoFichaje
                ? "bg-red-500 hover:bg-red-600 shadow-red-200/70"
                : "bg-gradient-to-r from-purple-500 via-indigo-500 to-indigo-600 hover:brightness-110 shadow-indigo-200/80"
            }`}
          >
            {ultimoFichaje ? "Registrar Salida" : "Registrar entrada"}
          </button>
        </form>
      </section>

      {role === "EMPLEADO" && (
        <SolicitudesFichajeEmpleado solicitudes={solicitudesFichaje} />
      )}

    </div>
  );
}
