"use client";

import { useActionState } from "react";
import {
  responderSolicitudModificacion,
  type ModificacionFichajeState,
} from "../actions/modificacion-fichaje-actions";

export type SolicitudFichajeEmpleado = {
  id: string;
  solicitanteNombre: string;
  solicitanteEmail: string;
  fichajeEntrada: string | null;
  fichajeSalida: string | null;
  entradaPropuesta: string | null;
  salidaPropuesta: string | null;
  motivo: string | null;
  createdAt: string;
};

type SolicitudesFichajeEmpleadoProps = {
  solicitudes: SolicitudFichajeEmpleado[];
};

const initialState: ModificacionFichajeState = { status: "idle" };

const formatDate = (value?: string | null) => {
  if (!value) return "Sin dato";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Sin dato" : date.toLocaleString("es-ES");
};

export default function SolicitudesFichajeEmpleado({
  solicitudes,
}: SolicitudesFichajeEmpleadoProps) {
  const [state, action, pending] = useActionState(
    responderSolicitudModificacion,
    initialState,
  );

  return (
    <section className="rounded-[2.5rem] border border-slate-100 bg-white p-8 shadow-[0_24px_80px_rgba(15,23,42,0.12)]">
      <header className="flex items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-sky-500/70">
            Solicitudes
          </p>
          <h3 className="text-2xl font-semibold text-slate-900">
            Modificacion de fichajes
          </h3>
        </div>
        <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700">
          {solicitudes.length} pendientes
        </span>
      </header>

      {state.message && (
        <div
          className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${
            state.status === "error"
              ? "border-rose-200 bg-rose-50 text-rose-700"
              : "border-emerald-100 bg-emerald-50 text-emerald-700"
          }`}
        >
          {state.message}
        </div>
      )}

      {solicitudes.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-slate-100 bg-slate-50/60 px-4 py-4 text-sm text-slate-600">
          No tienes solicitudes pendientes.
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {solicitudes.map((solicitud) => (
            <div
              key={solicitud.id}
              className="rounded-2xl border border-slate-100 bg-slate-50/60 px-5 py-4 text-sm text-slate-600"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-wider text-slate-400">
                    Gerente
                  </p>
                  <p className="font-semibold text-slate-900">
                    {solicitud.solicitanteNombre}
                  </p>
                  <p className="text-xs text-slate-500">
                    {solicitud.solicitanteEmail}
                  </p>
                </div>
                <div className="text-right text-xs text-slate-500">
                  {formatDate(solicitud.createdAt)}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-slate-100 bg-white px-4 py-3">
                  <p className="text-xs uppercase tracking-wider text-slate-400">
                    Fichaje actual
                  </p>
                  <p className="mt-1 text-sm text-slate-700">
                    Entrada: {formatDate(solicitud.fichajeEntrada)}
                  </p>
                  <p className="text-sm text-slate-700">
                    Salida: {formatDate(solicitud.fichajeSalida)}
                  </p>
                </div>
                <div className="rounded-xl border border-sky-100 bg-sky-50/40 px-4 py-3">
                  <p className="text-xs uppercase tracking-wider text-sky-400">
                    Propuesta
                  </p>
                  <p className="mt-1 text-sm text-slate-700">
                    Entrada: {formatDate(solicitud.entradaPropuesta)}
                  </p>
                  <p className="text-sm text-slate-700">
                    Salida: {formatDate(solicitud.salidaPropuesta)}
                  </p>
                </div>
              </div>

              <div className="mt-4 text-sm text-slate-600">
                <span className="text-xs uppercase tracking-wider text-slate-400">
                  Motivo
                </span>
                <p className="mt-1">{solicitud.motivo || "Sin motivo"}</p>
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                <form action={action} className="inline-flex">
                  <input type="hidden" name="id" value={solicitud.id} />
                  <input type="hidden" name="accion" value="ACEPTADA" />
                  <button
                    type="submit"
                    disabled={pending}
                    className="rounded-full bg-emerald-500 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-emerald-200/70 transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Aceptar
                  </button>
                </form>
                <form action={action} className="inline-flex">
                  <input type="hidden" name="id" value={solicitud.id} />
                  <input type="hidden" name="accion" value="RECHAZADA" />
                  <button
                    type="submit"
                    disabled={pending}
                    className="rounded-full border border-rose-300 px-4 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Rechazar
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

