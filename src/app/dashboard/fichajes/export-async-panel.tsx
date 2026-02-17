"use client";

import { useEffect, useMemo, useState } from "react";
import {
  crearExportacion,
  obtenerExportacion,
  type ExportacionStatus,
} from "../../actions/export-actions";

type ExportFilters = {
  from: string;
  to: string;
  estado: string;
  tipo: string;
  empresaId: string;
  empleadoId: string;
};

type ExportAsyncPanelProps = {
  filters: ExportFilters;
  canExport: boolean;
  showEmpresas: boolean;
  formId?: string;
};

type JobState = {
  id: string;
  status: ExportacionStatus["status"];
  url?: string | null;
  error?: string | null;
};

const pollIntervalMs = 4000;

export default function ExportAsyncPanel({
  filters,
  canExport,
  showEmpresas,
  formId,
}: ExportAsyncPanelProps) {
  const [jobFichajes, setJobFichajes] = useState<JobState | null>(null);
  const [jobEmpresas, setJobEmpresas] = useState<JobState | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [liveFilters, setLiveFilters] = useState<ExportFilters | null>(null);

  const resolveFilters = useMemo(() => liveFilters ?? filters, [liveFilters, filters]);

  useEffect(() => {
    if (!formId) return;
    const form = document.getElementById(formId) as HTMLFormElement | null;
    if (!form) return;

    const readFilters = () => {
      const data = new FormData(form);
      const value = (key: string) => {
        const raw = data.get(key);
        return typeof raw === "string" ? raw : "";
      };
      const next: ExportFilters = {
        from: value("from") || filters.from,
        to: value("to") || filters.to,
        estado: value("estado") || filters.estado,
        tipo: value("tipo") || filters.tipo,
        empresaId: value("empresaId") || "",
        empleadoId: value("empleadoId") || "",
      };
      setLiveFilters(next);
    };

    readFilters();
    form.addEventListener("input", readFilters);
    form.addEventListener("change", readFilters);
    return () => {
      form.removeEventListener("input", readFilters);
      form.removeEventListener("change", readFilters);
    };
  }, [formId, filters]);

  const canExportFichajes = Boolean(resolveFilters.empresaId || canExport);

  const startExport = async (tipo: "FICHAJES" | "FICHAJES_EMPRESAS") => {
    setIsCreating(true);
    const formData = new FormData();
    const active = resolveFilters;
    formData.set("tipo", tipo);
    formData.set("from", active.from || "");
    formData.set("to", active.to || "");
    formData.set("estado", active.estado || "todos");
    formData.set("tipoFiltro", active.tipo || "todos");
    if (tipo === "FICHAJES") {
      if (active.empresaId) formData.set("empresaId", active.empresaId);
      if (active.empleadoId) formData.set("empleadoId", active.empleadoId);
    }

    const result = await crearExportacion({ status: "idle" }, formData);
    if (result.status === "success" && result.jobId) {
      const state = { id: result.jobId, status: "PENDIENTE" as const };
      if (tipo === "FICHAJES") {
        setJobFichajes(state);
      } else {
        setJobEmpresas(state);
      }
    } else if (tipo === "FICHAJES") {
      setJobFichajes({
        id: "",
        status: "ERROR",
        error: result.message ?? "No se pudo crear la exportacion.",
      });
    } else {
      setJobEmpresas({
        id: "",
        status: "ERROR",
        error: result.message ?? "No se pudo crear la exportacion.",
      });
    }
    setIsCreating(false);
  };

  useEffect(() => {
    if (!jobFichajes?.id || jobFichajes.status === "LISTO" || jobFichajes.status === "ERROR") {
      return;
    }

    const timer = setInterval(async () => {
      const status = await obtenerExportacion(jobFichajes.id);
      if (status.status === "LISTO") {
        setJobFichajes({ id: jobFichajes.id, status: "LISTO", url: status.url ?? null });
      } else if (status.status === "ERROR") {
        setJobFichajes({ id: jobFichajes.id, status: "ERROR", error: status.error ?? null });
      } else {
        setJobFichajes((prev) => (prev ? { ...prev, status: status.status } : prev));
      }
    }, pollIntervalMs);

    return () => clearInterval(timer);
  }, [jobFichajes?.id, jobFichajes?.status]);

  useEffect(() => {
    if (!jobEmpresas?.id || jobEmpresas.status === "LISTO" || jobEmpresas.status === "ERROR") {
      return;
    }

    const timer = setInterval(async () => {
      const status = await obtenerExportacion(jobEmpresas.id);
      if (status.status === "LISTO") {
        setJobEmpresas({ id: jobEmpresas.id, status: "LISTO", url: status.url ?? null });
      } else if (status.status === "ERROR") {
        setJobEmpresas({ id: jobEmpresas.id, status: "ERROR", error: status.error ?? null });
      } else {
        setJobEmpresas((prev) => (prev ? { ...prev, status: status.status } : prev));
      }
    }, pollIntervalMs);

    return () => clearInterval(timer);
  }, [jobEmpresas?.id, jobEmpresas?.status]);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex flex-col gap-1">
        <button
          type="button"
          disabled={!canExportFichajes || isCreating}
          onClick={() => startExport("FICHAJES")}
          className={`rounded-full px-5 py-2 text-sm font-semibold shadow-lg transition ${
            canExportFichajes
              ? "bg-sky-500 text-white shadow-sky-200/60 hover:bg-sky-600"
              : "cursor-not-allowed bg-slate-200 text-slate-400"
          }`}
        >
          Generar informe
        </button>
        {jobFichajes?.status && (
          <div className="text-xs text-[color:var(--text-muted)]">
            {jobFichajes.status === "LISTO" && jobFichajes.url ? (
              <a
                href={jobFichajes.url}
                className="font-semibold text-sky-600"
              >
                Descargar informe
              </a>
            ) : jobFichajes.status === "ERROR" ? (
              jobFichajes.error ?? "Error generando exportacion."
            ) : (
              "Generando..."
            )}
          </div>
        )}
        {!canExportFichajes && (
          <div className="text-xs text-[color:var(--text-muted)]">
            Selecciona una empresa para exportar.
          </div>
        )}
      </div>

      {showEmpresas && (
        <div className="flex flex-col gap-1">
          <button
            type="button"
            disabled={isCreating}
            onClick={() => startExport("FICHAJES_EMPRESAS")}
            className="rounded-full border border-[color:var(--card-border)] bg-[color:var(--surface)] px-5 py-2 text-sm font-semibold text-[color:var(--text-secondary)] shadow-sm transition hover:text-[color:var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Generar por empresas
          </button>
          {jobEmpresas?.status && (
            <div className="text-xs text-[color:var(--text-muted)]">
              {jobEmpresas.status === "LISTO" && jobEmpresas.url ? (
                <a
                  href={jobEmpresas.url}
                  className="font-semibold text-sky-600"
                >
                  Descargar por empresas
                </a>
              ) : jobEmpresas.status === "ERROR" ? (
                jobEmpresas.error ?? "Error generando exportacion."
              ) : (
                "Generando..."
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
