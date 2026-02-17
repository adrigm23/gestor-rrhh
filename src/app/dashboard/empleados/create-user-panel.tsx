"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import CreateUserForm from "./create-user-form";

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

type CreateUserPanelProps = {
  empresas: EmpresaOption[];
  departamentos: DepartamentoOption[];
};

export default function CreateUserPanel({
  empresas,
  departamentos,
}: CreateUserPanelProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full bg-sky-500 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-sky-200/60 transition hover:bg-sky-600"
      >
        Nuevo usuario
      </button>

      {open && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-slate-900/35 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <aside className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col border-l border-[color:var(--card-border)] bg-[color:var(--card)] shadow-2xl">
            <div className="flex items-start justify-between border-b border-[color:var(--card-border)] px-6 py-5">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-sky-500/80">
                  Administracion
                </p>
                <h3 className="mt-2 text-lg font-semibold text-[color:var(--text-primary)]">
                  Nuevo usuario
                </h3>
                <p className="mt-1 text-xs text-[color:var(--text-muted)]">
                  Completa la ficha para dar de alta a un empleado o gerente.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full border border-[color:var(--card-border)] p-2 text-[color:var(--text-muted)] transition hover:text-[color:var(--text-primary)]"
                aria-label="Cerrar panel"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6">
              <CreateUserForm
                empresas={empresas}
                departamentos={departamentos}
                onCancel={() => setOpen(false)}
              />
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
