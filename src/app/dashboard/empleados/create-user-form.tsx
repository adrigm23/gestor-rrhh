"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { Briefcase, CreditCard, User } from "lucide-react";
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
  onCancel?: () => void;
};

const initialState: CrearUsuarioState = { status: "idle" };

export default function CreateUserForm({
  empresas,
  departamentos,
  onCancel,
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
      ? "border-rose-200 bg-rose-50 text-rose-700"
      : state.status === "success"
        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
        : "border-[color:var(--card-border)] bg-[color:var(--surface-muted)] text-[color:var(--text-muted)]";

  const inputClass =
    "w-full rounded-xl border border-[color:var(--card-border)] bg-[color:var(--surface)] px-3 py-2.5 text-sm text-[color:var(--text-secondary)] shadow-sm outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100";
  const selectClass = `${inputClass} pr-9`;

  return (
    <form
      id="crear-usuario"
      ref={formRef}
      action={formAction}
      className="flex flex-col gap-6"
    >
      <div
        className={`rounded-xl border px-4 py-3 text-sm ${statusClass}`}
        role={state.status === "error" ? "alert" : "status"}
        aria-live="polite"
      >
        {state.message ?? "Completa los datos para crear un usuario."}
      </div>

      <section className="space-y-4">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-sky-500">
          <User size={14} />
          Informacion personal
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-[color:var(--text-secondary)]">
              Nombre completo
            </label>
            <input
              name="nombre"
              type="text"
              required
              className={inputClass}
              placeholder="Ej: Ana Ruiz"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-[color:var(--text-secondary)]">
              Correo electronico
            </label>
            <input
              name="email"
              type="email"
              required
              className={inputClass}
              placeholder="ana@empresa.com"
            />
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold text-[color:var(--text-secondary)]">
            Contrasena temporal
          </label>
          <input
            name="password"
            type="password"
            required
            className={inputClass}
            placeholder="********"
          />
          <p className="text-xs text-[color:var(--text-muted)]">
            Se pedira cambiar al primer inicio de sesion.
          </p>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-sky-500">
          <Briefcase size={14} />
          Datos laborales
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-[color:var(--text-secondary)]">
              Empresa
            </label>
            <select
              name="empresaId"
              required
              value={empresaId}
              onChange={(event) => setEmpresaId(event.target.value)}
              className={selectClass}
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
            <label className="text-sm font-semibold text-[color:var(--text-secondary)]">
              Rol
            </label>
            <select
              name="rol"
              value={rol}
              onChange={(event) =>
                setRol(event.target.value === "GERENTE" ? "GERENTE" : "EMPLEADO")
              }
              className={selectClass}
            >
              <option value="EMPLEADO">Empleado</option>
              <option value="GERENTE">Gerente</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-[color:var(--text-secondary)]">
              Departamento (solo empleados)
            </label>
            <select
              name="departamentoId"
              disabled={disableDepartamento}
              key={`${empresaId}-${rol}`}
              className={`${selectClass} disabled:cursor-not-allowed disabled:bg-[color:var(--surface-muted)] disabled:text-[color:var(--text-muted)]`}
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

          {rol === "EMPLEADO" && (
            <div className="space-y-2">
              <label className="text-sm font-semibold text-[color:var(--text-secondary)]">
                Horas semanales de contrato
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
                className={inputClass}
                placeholder="40"
              />
            </div>
          )}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-sky-500">
          <CreditCard size={14} />
          Control de acceso
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold text-[color:var(--text-secondary)]">
            UID tarjeta NFC
          </label>
          <input
            name="nfcUid"
            type="text"
            inputMode="text"
            className={inputClass}
            placeholder="Escanear tarjeta..."
          />
          <p className="text-xs text-[color:var(--text-muted)]">
            Formato HEX (Ej: 04:8A:2C:9E). Usa el lector para autocompletar.
          </p>
        </div>
      </section>

      <div className="flex flex-col gap-3 border-t border-[color:var(--card-border)] pt-4 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full border border-[color:var(--card-border)] px-5 py-2 text-sm font-semibold text-[color:var(--text-secondary)] transition hover:text-[color:var(--text-primary)]"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-full bg-sky-500 px-6 py-2 text-sm font-semibold text-white shadow-lg shadow-sky-200/60 transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isPending ? "Guardando..." : "Guardar usuario"}
        </button>
      </div>
    </form>
  );
}
