"use client";

import { useEffect, useState } from "react";
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
  canQuery: boolean;
  showEmpresas: boolean;
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
  canQuery,
  showEmpresas,
}: ExportAsyncPanelProps) {
  const [jobFichajes, setJobFichajes] = useState<JobState | null>(null);
  const [jobEmpresas, setJobEmpresas] = useState<JobState | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const startExport = async (tipo: "FICHAJES" | "FICHAJES_EMPRESAS") => {
    setIsCreating(true);
    const formData = new FormData();
    formData.set("tipo", tipo);
    formData.set("from", filters.from);
    formData.set("to", filters.to);
    formData.set("estado", filters.estado);
    formData.set("tipoFiltro", filters.tipo);
    if (filters.empresaId) formData.set("empresaId", filters.empresaId);
    if (filters.empleadoId) formData.set("empleadoId", filters.empleadoId);

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
          disabled={!canQuery || isCreating}
          onClick={() => startExport("FICHAJES")}
          className={`rounded-full px-5 py-2 text-sm font-semibold shadow-lg transition ${
            canQuery
              ? "bg-teal-500 text-white shadow-teal-200/60 hover:bg-teal-600"
              : "cursor-not-allowed bg-teal-300 text-white/70"
          }`}
        >
          Generar informe
        </button>
        {jobFichajes?.status && (
          <div className="text-xs text-slate-500">
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
      </div>

      {showEmpresas && (
        <div className="flex flex-col gap-1">
          <button
            type="button"
            disabled={isCreating}
            onClick={() => startExport("FICHAJES_EMPRESAS")}
            className="rounded-full border border-slate-200 bg-white px-5 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-60"
          >
            Generar por empresas
          </button>
          {jobEmpresas?.status && (
            <div className="text-xs text-slate-500">
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
