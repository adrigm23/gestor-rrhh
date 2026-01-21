"use client";

import { useActionState } from "react";
import {
  crearSolicitudModificacion,
  type ModificacionFichajeState,
} from "../../actions/modificacion-fichaje-actions";

type EmpleadoOption = {
  id: string;
  nombre: string;
  email: string;
};

type FichajeOption = {
  id: string;
  empleadoNombre: string;
  empleadoEmail: string;
  entrada: string;
  salida: string | null;
};

type ModificacionFichajeFormProps = {
  empleados: EmpleadoOption[];
  fichajes: FichajeOption[];
};

const initialState: ModificacionFichajeState = { status: "idle" };

const formatFichaje = (item: FichajeOption) => {
  const entrada = new Date(item.entrada).toLocaleString("es-ES");
  const salida = item.salida ? new Date(item.salida).toLocaleString("es-ES") : "Sin salida";
  return `${item.empleadoNombre} - ${entrada} (${salida})`;
};

export default function ModificacionFichajeForm({
  empleados,
  fichajes,
}: ModificacionFichajeFormProps) {
  const [state, action, pending] = useActionState(
    crearSolicitudModificacion,
    initialState,
  );

  return (
    <form action={action} className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">
          Enviar solicitud de modificacion
        </h3>
        <p className="mt-1 text-sm text-slate-500">
          El empleado recibira la solicitud para validar el cambio de fichaje.
        </p>
      </div>

      {state.message && (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm ${
            state.status === "error"
              ? "border-rose-200 bg-rose-50 text-rose-700"
              : "border-emerald-100 bg-emerald-50 text-emerald-700"
          }`}
        >
          {state.message}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700">Empleado</label>
          <select
            name="empleadoId"
            required
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200"
          >
            <option value="">Selecciona un empleado</option>
            {empleados.map((empleado) => (
              <option key={empleado.id} value={empleado.id}>
                {empleado.nombre} - {empleado.email}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700">
            Fichaje a modificar (opcional)
          </label>
          <select
            name="fichajeId"
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200"
          >
            <option value="">Crear fichaje nuevo</option>
            {fichajes.map((fichaje) => (
              <option key={fichaje.id} value={fichaje.id}>
                {formatFichaje(fichaje)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700">
            Nueva entrada
          </label>
          <input
            name="entrada"
            type="datetime-local"
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700">
            Nueva salida
          </label>
          <input
            name="salida"
            type="datetime-local"
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-semibold text-slate-700">Motivo</label>
        <textarea
          name="motivo"
          rows={3}
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200"
          placeholder="Ej: Olvido registrar salida"
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-full bg-gradient-to-r from-teal-500 via-sky-500 to-sky-600 py-4 text-sm font-semibold text-white shadow-xl shadow-sky-200/70 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {pending ? "Enviando..." : "Enviar solicitud"}
      </button>
    </form>
  );
}

