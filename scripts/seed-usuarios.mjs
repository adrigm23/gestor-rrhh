// Script para dar de alta usuarios en la BD directamente con Prisma
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { config } from "dotenv";

config(); // carga .env

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });
const SALT_ROUNDS = 12; // Auditoría de seguridad (Fase 2.19, hallazgo #8): igual que src/app/utils/password.ts
const DNI_LETTERS = "TRWAGMYFPDXBNJZSQVHLCKE";

// Auditoría de seguridad (Fase 2.19, hallazgo #16): antes había una única
// contraseña temporal fija ("Temporal1!") para todos los usuarios creados
// por este script, impresa en consola — cualquiera con el historial de
// terminal (o este propio archivo) tenía la contraseña de arranque de
// cualquier cuenta creada así, mientras `passwordMustChange` no se cumpliera
// primero. Ahora cada usuario recibe una contraseña aleatoria propia.
function generateTempPassword() {
  // 16 caracteres en base64url (sin +/=) — cumple de sobra cualquier
  // política de complejidad razonable y no depende de un alfabeto a mano.
  return crypto.randomBytes(12).toString("base64url");
}

function normalizeDni(value) {
  return value.trim().toUpperCase().replace(/[-\s]/g, "");
}

function isValidDni(dni) {
  const dniRegex = /^(\d{8}|[XYZ]\d{7})[A-Z]$/;
  if (!dniRegex.test(dni)) return false;
  const prefix = dni[0];
  const numericPartRaw =
    prefix === "X" ? `0${dni.slice(1, 8)}`
    : prefix === "Y" ? `1${dni.slice(1, 8)}`
    : prefix === "Z" ? `2${dni.slice(1, 8)}`
    : dni.slice(0, 8);
  const number = Number.parseInt(numericPartRaw, 10);
  if (!Number.isFinite(number)) return false;
  return DNI_LETTERS[number % 23] === dni.slice(-1);
}

const usuarios = [
  {
    nombre: "Candela Osuna Falder",
    dni: "44373790M",
    email: "formacion@infinitoformacion.com",
    rol: "EMPLEADO",
    horasSemanales: 40,
    fechaInicio: new Date("2026-06-18"),
    fechaFin: null,
  },
  {
    nombre: "Estefania Casares Cañasveras",
    dni: "30836328K",
    email: "administracion@infinitoformacion.com",
    rol: "EMPLEADO",
    horasSemanales: 40,
    fechaInicio: new Date("2026-06-18"),
    fechaFin: null,
  },
  {
    nombre: "Jose Luis Castillejos Barbarroja",
    dni: "30209532K",
    email: "jluis151972@gmail.com",
    rol: "EMPLEADO",
    horasSemanales: 40,
    fechaInicio: new Date("2026-06-18"),
    fechaFin: null,
  },
  {
    nombre: "Francisco Javier Dorado",
    dni: "75707821D",
    email: "fcojavierdorado27@hotmail.com",
    rol: "EMPLEADO",
    horasSemanales: 40,
    fechaInicio: new Date("2026-06-15"),
    fechaFin: new Date("2026-07-07"),
  },
];

async function main() {
  // Buscar la empresa
  const empresa = await prisma.empresa.findFirst({
    where: { nombre: { contains: "Infinito", mode: "insensitive" } },
    select: { id: true, nombre: true },
  });

  if (!empresa) {
    console.error("❌ No se encontró ninguna empresa con 'Infinito' en el nombre.");
    process.exit(1);
  }

  console.log(`✅ Empresa encontrada: "${empresa.nombre}" (${empresa.id})\n`);

  const creados = [];

  for (const u of usuarios) {
    const dni = normalizeDni(u.dni);

    if (!isValidDni(dni)) {
      console.error(`❌ DNI inválido: ${dni} — omitiendo`);
      continue;
    }

    // Comprobar si ya existe
    const existeEmail = await prisma.usuario.findUnique({ where: { email: u.email }, select: { id: true } });
    if (existeEmail) {
      console.log(`⚠️  Ya existe un usuario con email ${u.email} — omitiendo`);
      continue;
    }

    const existeDni = await prisma.usuario.findUnique({ where: { dni }, select: { id: true } });
    if (existeDni) {
      console.log(`⚠️  Ya existe un usuario con DNI ${dni} — omitiendo`);
      continue;
    }

    const tempPassword = generateTempPassword();
    const hashedPassword = await bcrypt.hash(tempPassword, SALT_ROUNDS);

    await prisma.$transaction(async (tx) => {
      const usuario = await tx.usuario.create({
        data: {
          nombre: u.nombre,
          dni,
          email: u.email,
          password: hashedPassword,
          passwordMustChange: true,
          rol: u.rol,
          empresaId: empresa.id,
        },
      });

      await tx.contrato.create({
        data: {
          usuarioId: usuario.id,
          horasSemanales: u.horasSemanales,
          fechaInicio: u.fechaInicio,
          ...(u.fechaFin ? { fechaFin: u.fechaFin } : {}),
        },
      });
    });

    creados.push({ nombre: u.nombre, email: u.email, tempPassword });
    console.log(`✅ Creado: ${u.nombre} (${dni}) — ${u.email}`);
    if (u.fechaFin) {
      console.log(`   Contrato: ${u.fechaInicio.toLocaleDateString("es-ES")} → ${u.fechaFin.toLocaleDateString("es-ES")}`);
    }
  }

  if (creados.length > 0) {
    console.log("\n✅ Proceso completado. Contraseñas temporales (una por usuario, comunícalas por un canal seguro y no las dejes en este historial):");
    for (const c of creados) {
      console.log(`   ${c.email} → ${c.tempPassword}`);
    }
  } else {
    console.log("\n✅ Proceso completado. No se creó ningún usuario nuevo.");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
