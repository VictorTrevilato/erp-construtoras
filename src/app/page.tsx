import { prisma } from "@/lib/prisma";

export default async function Home() {
  // O Prisma usa 'findMany' ou 'findFirst'
  // Substitua 'ycEmpresas' pelo nome exato que está no seu prisma/schema.prisma (na parte 'model Nome {...}')
  const empresas = await prisma.ycEmpresas.findMany({
    take: 5 // Pega só as 5 primeiras (TOP 5)
  });

  return (
    <div className="p-10 font-sans">
      <h1 className="text-2xl font-bold mb-4">Teste de Conexão Azure + Prisma</h1>
      <ul className="space-y-2">
        {empresas.map((empresa: any) => (
          <li key={empresa.id} className="p-4 border rounded shadow bg-gray-50 text-black">
            {/* Ajuste os campos 'id' e 'nome' conforme suas colunas reais */}
            ID: {empresa.id} - Nome: {empresa.nome}
          </li>
        ))}
      </ul>
      
      <div className="mt-6 p-4 bg-green-100 text-green-800 rounded">
        Se você está vendo a lista acima, vencemos a guerra! 🚀
      </div>
    </div>
  );
}