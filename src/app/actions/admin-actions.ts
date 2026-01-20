// src/app/actions/admin-actions.ts
"use server";

import { prisma } from "../lib/prisma";
import { hashPassword } from "../utils/password"; // 👈 Mucho más corto y directo
import { revalidatePath } from "next/cache";
import { auth } from "../api/auth/auth";

export async function crearGerente(formData: FormData) {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("No autorizado");
  }

  const creador = await prisma.usuario.findUnique({
    where: { id: session.user.id },
    select: { rol: true },
  });

  if (!creador || creador.rol !== "ADMIN_SISTEMA") {
    throw new Error("No autorizado");
  }

  const nombre = formData.get("nombre") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const empresaId = formData.get("empresaId") as string;

  if (!nombre || !email || !password || !empresaId) return;

  try {
    const hashedPassword = await hashPassword(password);

    await prisma.usuario.create({
      data: {
        nombre,
        email,
        password: hashedPassword,
        rol: "GERENTE", 
        empresaId,      
      }
    });

  } catch (error) {
    console.error("Error al crear gerente:", error);
    // Podrías devolver un objeto de error aquí si lo necesitas
    return;
  }

  // Refrescamos los datos y podrías redirigir o simplemente limpiar el formulario
  revalidatePath("/dashboard");
}

export async function crearEmpleado(formData: FormData) {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("No autorizado");
  }

  const nombre = formData.get("nombre") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const departamentoId = (formData.get("departamentoId") as string) || null;
  const empresaIdForm = (formData.get("empresaId") as string) || null;

  if (!nombre || !email || !password) return;

  const creador = await prisma.usuario.findUnique({
    where: { id: session.user.id },
    select: { rol: true, empresaId: true },
  });

  if (!creador || creador.rol !== "ADMIN_SISTEMA") {
    throw new Error("No autorizado");
  }

  if (!empresaIdForm) {
    throw new Error("Empresa requerida");
  }

  try {
    const hashedPassword = await hashPassword(password);

    if (departamentoId) {
      const departamento = await prisma.departamento.findUnique({
        where: { id: departamentoId },
        select: { empresaId: true },
      });

      if (!departamento || departamento.empresaId !== empresaIdForm) {
        throw new Error("Departamento invalido");
      }
    }

    await prisma.usuario.create({
      data: {
        nombre,
        email,
        password: hashedPassword,
        rol: "EMPLEADO",
        empresaId: empresaIdForm,
        departamentoId,
      },
    });
  } catch (error) {
    console.error("Error al crear empleado:", error);
    return;
  }

  revalidatePath("/dashboard/empleados");
}
