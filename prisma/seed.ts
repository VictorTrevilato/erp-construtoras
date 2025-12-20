import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Começando o seed...')

  // Criando uma empresa de teste
  const empresa = await prisma.ycEmpresas.create({
    data: {
      nome: 'Construtora Exemplo Ltda',
      cnpj: '12.345.678/0001-99',
      ativo: true,
      // Adicione outros campos obrigatórios se houver, mas pelo schema parecem opcionais
    }
  })

  console.log(`✅ Empresa criada com ID: ${empresa.id}`)
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })