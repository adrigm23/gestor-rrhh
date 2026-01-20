// prisma/seed.ts
import { PrismaClient, Rol } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import * as dotenv from 'dotenv'

// IMPORTANTE: Ajusta la ruta según tu estructura (src/utils/password.ts)
import { hashPassword } from '../src/app/utils/password' 

dotenv.config()

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({
  adapter,
})

async function main() {
  console.log('🚀 Iniciando seed Prisma 7 + PostgreSQL')

  await prisma.$connect()
  console.log('✅ Conectado a Supabase')

  // 1. Crear o actualizar Empresa
  const empresa = await prisma.empresa.upsert({
    where: { cif: 'B12345678' },
    update: {},
    create: {
      nombre: 'Mi Aplicación SaaS',
      cif: 'B12345678',
      plan: 'FREE',
    },
  })

  // 2. GENERAR EL HASH DE LA CONTRASEÑA
  const hashedAdminPassword = await hashPassword('admin_password')

  // 3. Crear o actualizar Usuario administrador con la contraseña encriptada
  await prisma.usuario.upsert({
    where: { email: 'admin@test.com' },
    update: {
      password: hashedAdminPassword // Actualiza la contraseña si el usuario ya existe
    },
    create: {
      nombre: 'Adrian Admin',
      email: 'admin@test.com',
      password: hashedAdminPassword, // <--- Ahora se guarda el hash
      rol: Rol.GERENTE,
      empresaId: empresa.id,
    },
  })

  console.log('✅ Seed ejecutado correctamente con contraseña encriptada')
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
    await pool.end()
  })