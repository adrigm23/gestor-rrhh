"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { crearUsuario, type CrearUsuarioState } from "../../actions/admin-actions";

type EmpresaOption = {
  id: string;
  nombre: string;
};

type DepartamentoOption = {
  id: string;
  nombre: string;
  empresaId?: string | null;
  empresa?: { nombre?: string | null } | null;
};

type CreateUserFormProps = {
  empresas: EmpresaOption[];
  departamentos: DepartamentoOption[];
};

const initialState: CrearUsuarioState = { status: "idle" };

export default function CreateUserForm({
  empresas,
  departamentos,
}: CreateUserFormProps) {
  const [state, formAction, isPending] = useActionState(crearUsuario, initialState);
  const [rol, setRol] = useState<"EMPLEADO" | "GERENTE">("EMPLEADO");
  const [empresaId, setEmpresaId] = useState("");
  const [horasSemanales, setHorasSemanales] = useState("40");
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
      setRol("EMPLEADO");
      setEmpresaId("");
      setHorasSemanales("40");
    }
  }, [state.status]);

  const departamentosFiltrados = useMemo(() => {
    if (!empresaId) {
      return [];
    }
    return departamentos.filter(
      (departamento) => departamento.empresaId === empresaId,
    );
  }, [departamentos, empresaId]);

  const isGerente = rol === "GERENTE";
  const disableDepartamento = isGerente || !empresaId;
  const statusClass =
    state.status === "error"
      ? "border-red-200 bg-red-50 text-red-600"
      : state.status === "success"
        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
        : "border-slate-200 bg-white text-slate-500";

  return (
    <form
      id="crear-usuario"
      ref={formRef}
      action={formAction}
      className="space-y-6"
    >
      <div>
        <h3 className="text-lg font-semibold text-slate-900">Crear usuario</h3>
        <p className="mt-1 text-sm text-slate-500">
          Solo el administrador puede crear usuarios para controlar la tarifa.
        </p>
      </div>

      <div
        className={`rounded-2xl border px-4 py-3 text-sm ${statusClass}`}
        role={state.status === "error" ? "alert" : "status"}
        aria-live="polite"
      >
        {state.message ?? "Completa los datos para crear un usuario."}
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700">
            Nombre completo
          </label>
          <input
            name="nombre"
            type="text"
            required
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200"
            placeholder="Ej: Ana Ruiz"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700">Email</label>
          <input
            name="email"
            type="email"
            required
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200"
            placeholder="correo@empresa.com"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700">Contrasena</label>
          <input
            name="password"
            type="password"
            required
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200"
            placeholder="********"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700">
            UID tarjeta (opcional)
          </label>
          <input
            name="nfcUid"
            type="text"
            inputMode="numeric"
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200"
            placeholder="Pasa la tarjeta por el lector"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700">Empresa</label>
          <select
            name="empresaId"
            required
            value={empresaId}
            onChange={(event) => setEmpresaId(event.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200"
          >
            <option value="">Selecciona empresa</option>
            {empresas.map((empresa) => (
              <option key={empresa.id} value={empresa.id}>
                {empresa.nombre}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700">Rol</label>
          <select
            name="rol"
            value={rol}
            onChange={(event) =>
              setRol(event.target.value === "GERENTE" ? "GERENTE" : "EMPLEADO")
            }
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200"
          >
            <option value="EMPLEADO">Empleado</option>
            <option value="GERENTE">Gerente</option>
          </select>
        </div>

        {rol === "EMPLEADO" && (
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">
              Horas semanales contrato
            </label>
            <input
              name="horasSemanales"
              type="number"
              min="1"
              max="60"
              step="0.5"
              required
              value={horasSemanales}
              onChange={(event) => setHorasSemanales(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200"
              placeholder="40"
            />
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700">
            Departamento (solo empleados)
          </label>
          <select
            name="departamentoId"
            disabled={disableDepartamento}
            key={`${empresaId}-${rol}`}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200 disabled:cursor-not-allowed disabled:bg-slate-50"
          >
            <option value="">Sin departamento</option>
            {departamentosFiltrados.map((departamento) => (
              <option key={departamento.id} value={departamento.id}>
                {departamento.nombre}
                {departamento.empresa?.nombre
                  ? ` - ${departamento.empresa.nombre}`
                  : ""}
              </option>
            ))}
          </select>
        </div>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-full bg-gradient-to-r from-teal-500 via-sky-500 to-sky-600 py-4 text-sm font-semibold text-white shadow-xl shadow-sky-200/70 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isPending ? "Creando..." : "Crear usuario"}
      </button>
    </form>
  );
}
