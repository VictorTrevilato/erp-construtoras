import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando Seed...')

  // 1. Criar/Atualizar a Empresa YouCon (CNPJ é único, então upsert funciona)
  const empresa = await prisma.ycEmpresas.upsert({
    where: { cnpj: '12.345.678/0001-99' },
    update: {},
    create: {
      nome: 'YouCon Construtora',
      cnpj: '12.345.678/0001-99',
      ativo: true
    }
  })
  console.log(`🏢 Empresa: ${empresa.nome} (ID: ${empresa.id})`)

  // 2. Criar Cargos (Nome NÃO é único, então usamos findFirst)
  
  // Cargo Diretor
  let cargoDiretor = await prisma.ycCargos.findFirst({
    where: { nome: 'Diretor', sysTenantId: empresa.id }
  })
  if (!cargoDiretor) {
    cargoDiretor = await prisma.ycCargos.create({
      data: { 
        nome: 'Diretor', 
        interno: true, 
        ativo: true,
        sysTenantId: empresa.id // Obrigatório pelo schema
      }
    })
  }

  // Cargo Cliente
  let cargoCliente = await prisma.ycCargos.findFirst({
    where: { nome: 'Cliente Proprietário', sysTenantId: empresa.id }
  })
  if (!cargoCliente) {
    cargoCliente = await prisma.ycCargos.create({
      data: { 
        nome: 'Cliente Proprietário', 
        interno: false, 
        ativo: true,
        sysTenantId: empresa.id 
      }
    })
  }
  console.log(`👔 Cargos ID: Diretor(${cargoDiretor.id}) | Cliente(${cargoCliente.id})`)

  // 3. Usuário Admin
  const email = 'admin@construtora.com'
  const passwordHash = await bcrypt.hash('admin', 10)
  
  const usuario = await prisma.ycUsuarios.upsert({
    where: { email },
    update: { isSuperAdmin: true },
    create: {
      email,
      nome: 'Victor Multi-Role',
      passwordHash,
      ativo: true,
      isSuperAdmin: true
    }
  })
  console.log(`👤 Usuário: ${usuario.nome} (ID: ${usuario.id})`)

  // 4. Vínculos (Limpar e Recriar)
  // Usamos deleteMany pois a chave única é composta
  await prisma.ycUsuariosEmpresas.deleteMany({
    where: { usuarioId: usuario.id, sysTenantId: empresa.id }
  })

  // Vínculo 1: Diretor
  await prisma.ycUsuariosEmpresas.create({
    data: {
      usuarioId: usuario.id, // CORRIGIDO: Era userId
      sysTenantId: empresa.id,
      cargoId: cargoDiretor.id
    }
  })

  // Vínculo 2: Cliente
  await prisma.ycUsuariosEmpresas.create({
    data: {
      usuarioId: usuario.id, // CORRIGIDO: Era userId
      sysTenantId: empresa.id,
      cargoId: cargoCliente.id
    }
  })

  console.log('✅ Vínculos criados com sucesso!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })