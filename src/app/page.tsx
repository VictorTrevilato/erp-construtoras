import { prisma } from "@/lib/prisma";
export const dynamic = "force-dynamic";

export default async function Home() {
  // O Prisma já sabe que isso retorna um array de 'ycEmpresas'
  const empresas = await prisma.ycEmpresas.findMany({
    take: 5
  });

  return (
    <div className="p-10 font-sans">
      <h1 className="text-2xl font-bold mb-4">Teste de Conexão Azure + Prisma</h1>
      <ul className="space-y-2">
        {/* Removemos o ': any'. O TS infere o tipo automaticamente agora. */}
        {empresas.map((empresa) => (
          <li key={empresa.id.toString()} className="p-4 border rounded shadow bg-gray-50 text-black">
            {/* Convertemos BigInt para String para evitar erro do React */}
            ID: {empresa.id.toString()} - Nome: {empresa.nome}
          </li>
        ))}
      </ul>
      
      <div className="mt-6 p-4 bg-green-100 text-green-800 rounded">
        Se você está vendo a lista acima, vencemos a guerra! 🚀
      </div>
    </div>
  );
}