"use server";

import { auth } from "../api/auth/auth";
import { prisma } from "../lib/prisma";
import { revalidatePath } from "next/cache";
import {
  sanitizeFormDataId,
  sanitizeFormDataString,
  sanitizeString,
} from "../utils/input";
import { empresaService } from "../../services/empresa";

export type EmpresaState = {
  status: "idle" | "error" | "success";
  message?: string;
};

export type EliminarEmpresaState = {
  status: "idle" | "error" | "success";
  message?: string;
};

export type EmpresaConfigState = {
  status: "idle" | "error" | "success";
  message?: string;
};

const emptySuccess: EmpresaState = { status: "success" };
const emptyError: EmpresaState = { status: "error" };
const emptyDeleteSuccess: EliminarEmpresaState = { status: "success" };
const emptyDeleteError: EliminarEmpresaState = { status: "error" };
const emptyConfigSuccess: EmpresaConfigState = { status: "success" };
const emptyConfigError: EmpresaConfigState = { status: "error" };

const normalizeNombre = (value?: string | null) =>
  sanitizeString(value, { collapseWhitespace: true });

const normalizeCif = (value?: string | null) =>
  sanitizeString(value).toUpperCase();

export async function crearEmpresa(
  _prevState: EmpresaState,
  formData: FormData,
): Promise<EmpresaState> {
  const session = await auth();

  if (!session?.user?.id) {
    return { ...emptyError, message: "No autorizado." };
  }

  const creador = await prisma.usuario.findUnique({
    where: { id: session.user.id },
    select: { rol: true },
  });

  if (!creador || creador.rol !== "ADMIN_SISTEMA") {
    return { ...emptyError, message: "No autorizado." };
  }

  const nombre = normalizeNombre(sanitizeFormDataString(formData, "nombre"));
  const cif = normalizeCif(sanitizeFormDataString(formData, "cif"));

  if (!nombre || !cif) {
    return { ...emptyError, message: "Nombre y CIF son obligatorios." };
  }

  if (cif.length < 6) {
    return { ...emptyError, message: "CIF invalido." };
  }

  try {
    const result = await empresaService.crearEmpresa({ nombre, cif });

    switch (result.outcome) {
      case "ok":
        break;
      case "cif-duplicado":
        return { ...emptyError, message: "Ese CIF ya esta registrado." };
      case "nombre-duplicado":
        return { ...emptyError, message: "Ya existe una empresa con ese nombre." };
    }
  } catch (error) {
    console.error("Error al crear empresa:", error);
    return { ...emptyError, message: "No se pudo crear la empresa." };
  }

  revalidatePath("/dashboard/empresas");
  revalidatePath("/dashboard/centros-trabajo");
  revalidatePath("/dashboard/departamentos");
  revalidatePath("/dashboard/empleados");
  return { ...emptySuccess, message: "Empresa creada correctamente." };
}

export async function eliminarEmpresa(
  _prevState: EliminarEmpresaState,
  formData: FormData,
): Promise<EliminarEmpresaState> {
  const session = await auth();

  if (!session?.user?.id) {
    return { ...emptyDeleteError, message: "No autorizado." };
  }

  const creador = await prisma.usuario.findUnique({
    where: { id: session.user.id },
    select: { rol: true },
  });

  if (!creador || creador.rol !== "ADMIN_SISTEMA") {
    return { ...emptyDeleteError, message: "No autorizado." };
  }

  const empresaId = sanitizeFormDataId(formData, "empresaId");

  if (!empresaId) {
    return { ...emptyDeleteError, message: "Empresa invalida." };
  }

  try {
    const result = await empresaService.eliminarEmpresa(empresaId);

    switch (result.outcome) {
      case "ok":
        break;
      case "not-found":
        return { ...emptyDeleteError, message: "Empresa no encontrada." };
      case "has-admins":
        return {
          ...emptyDeleteError,
          message: "No se puede eliminar: hay administradores asociados.",
        };
      case "has-blockers":
        return {
          ...emptyDeleteError,
          message:
            "No se puede eliminar: hay usuarios, departamentos o centros asociados.",
        };
    }
  } catch (error) {
    console.error("Error al eliminar empresa:", error);
    return { ...emptyDeleteError, message: "No se pudo eliminar la empresa." };
  }

  revalidatePath("/dashboard/empresas");
  revalidatePath("/dashboard/centros-trabajo");
  revalidatePath("/dashboard/departamentos");
  revalidatePath("/dashboard/empleados");
  return { ...emptyDeleteSuccess, message: "Empresa eliminada." };
}

export async function actualizarPausaEmpresa(
  _prevState: EmpresaConfigState,
  formData: FormData,
): Promise<EmpresaConfigState> {
  const session = await auth();

  if (!session?.user?.id) {
    return { ...emptyConfigError, message: "No autorizado." };
  }

  const usuario = await prisma.usuario.findUnique({
    where: { id: session.user.id },
    select: { rol: true },
  });

  // Se expone desde dos sitios: dashboard/empresas (ADMIN_SISTEMA, sobre
  // cualquier empresa) y dashboard/ajustes (GERENTE, solo sobre la suya).
  if (!usuario || (usuario.rol !== "ADMIN_SISTEMA" && usuario.rol !== "GERENTE")) {
    return { ...emptyConfigError, message: "No autorizado." };
  }

  const empresaId = sanitizeFormDataId(formData, "empresaId");
  const valorRaw =
    sanitizeFormDataString(formData, "pausaCuenta").toLowerCase() || "true";
  const pausaCuenta = valorRaw === "true" || valorRaw === "1";
  const geoRaw =
    sanitizeFormDataString(formData, "geoFichaje").toLowerCase() || "false";
  const geolocalizacionFichaje = geoRaw === "true" || geoRaw === "1";

  if (!empresaId) {
    return { ...emptyConfigError, message: "Empresa invalida." };
  }

  const result = await empresaService.actualizarConfig(session.user.id, usuario.rol, empresaId, {
    pausaCuentaComoTrabajo: pausaCuenta,
    geolocalizacionFichaje,
  });

  if (result.outcome === "not-found") {
    return { ...emptyConfigError, message: "Empresa invalida." };
  }
  if (result.outcome === "forbidden") {
    return { ...emptyConfigError, message: "No autorizado." };
  }

  revalidatePath("/dashboard/empresas");
  revalidatePath("/dashboard/ajustes");
  revalidatePath("/dashboard/escritorio");
  revalidatePath("/dashboard");
  return { ...emptyConfigSuccess, message: "Preferencia actualizada." };
}
