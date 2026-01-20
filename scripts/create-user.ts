import 'dotenv/config'
import { PrismaClient, Rol } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import { hashPassword } from '../src/app/utils/password'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  const email = 'admin@admin.com'
  const password = 'Admin1234'

  const hashedPassword = await hashPassword(password)

  const empresa = await prisma.empresa.create({
    data: {
      nombre: 'Empresa Demo',
      cif: 'A12345678',
    },
  })

  const user = await prisma.usuario.create({
    data: {
      nombre: 'Admin Sistema',
      email: email.toLowerCase(),
      password: hashedPassword,
      rol: Rol.ADMIN_SISTEMA,
      empresaId: empresa.id,
    },
  })

  console.log('✅ Usuario creado:', user)
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect()
  })
