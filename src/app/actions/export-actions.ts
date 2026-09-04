"use server";

import { auth } from "../api/auth/auth";
import {
  sanitizeFormDataId,
  sanitizeFormDataString,
} from "../utils/input";
import { exportService, type ExportacionStatus, type Rol } from "../../services/export";

export type { ExportacionStatus };

export type ExportacionState = {
  status: "idle" | "error" | "success";
  message?: string;
  jobId?: string;
};

const emptySuccess: ExportacionState = { status: "success" };
const emptyError: ExportacionState = { status: "error" };

export async function crearExportacion(
  _prevState: ExportacionState,
  formData: FormData,
): Promise<ExportacionState> {
  const session = await auth();

  if (!session?.user?.id) {
    return { ...emptyError, message: "No autorizado." };
  }

  const role = session.user?.role ?? "";
  if (role === "EMPLEADO") {
    return { ...emptyError, message: "No autorizado." };
  }

  const tipo = sanitizeFormDataString(formData, "tipo").toUpperCase() || "FICHAJES";
  if (tipo !== "FICHAJES" && tipo !== "FICHAJES_EMPRESAS") {
    return { ...emptyError, message: "Tipo invalido." };
  }

  const empresaIdForm = sanitizeFormDataId(formData, "empresaId");
  const empleadoId = sanitizeFormDataId(formData, "empleadoId");
  const from = sanitizeFormDataString(formData, "from", { maxLength: 10 });
  const to = sanitizeFormDataString(formData, "to", { maxLength: 10 });
  const estado = sanitizeFormDataString(formData, "estado").toLowerCase();
  const tipoFiltro = sanitizeFormDataString(formData, "tipoFiltro");

  const result = await exportService.crearExportacion(session.user.id, role as Rol, {
    tipo,
    filtros: {
      from: from || undefined,
      to: to || undefined,
      estado: estado || "todos",
      tipo: tipoFiltro || "todos",
      empresaId: empresaIdForm || undefined,
      empleadoId: empleadoId || undefined,
    },
    empresaIdForm,
  });

  switch (result.outcome) {
    case "ok":
      return { ...emptySuccess, jobId: result.jobId };
    case "invalid-tipo":
      return { ...emptyError, message: "Tipo invalido." };
    case "empresa-requerida":
      return { ...emptyError, message: "Selecciona una empresa." };
    case "invalid-empresa":
      return { ...emptyError, message: "Empresa invalida." };
    case "invalid-empleado":
      return { ...emptyError, message: "Empleado invalido." };
    case "empleado-fuera-de-empresa":
      return {
        ...emptyError,
        message: "El empleado no pertenece a la empresa seleccionada.",
      };
  }
}

export async function obtenerExportacion(jobId: string): Promise<ExportacionStatus> {
  const session = await auth();

  if (!session?.user?.id) {
    return { status: "ERROR", error: "No autorizado" };
  }

  return exportService.obtenerExportacion(session.user.id, jobId);
}
