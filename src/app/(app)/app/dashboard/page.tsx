import { Protect } from "@/components/protect"
import { Button } from "@/components/ui/button" // Supondo que você já tenha o shadcn button
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Trash2, PlusCircle, Lock } from "lucide-react"

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Dashboard ERP</h1>
      
      <div className="grid gap-4 md:grid-cols-2">
        {/* Card de Teste de Permissões */}
        <Card>
          <CardHeader>
            <CardTitle>Teste de Permissões (Visual)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-500">
              Os botões abaixo só aparecem se o seu usuário tiver as permissões exatas no banco de dados.
            </p>

            {/* TESTE 1: Botão que deve APARECER (Simulando uma permissão comum) */}
            {/* Vamos tentar usar uma string que talvez já exista ou vamos criar um "falso positivo" depois */}
            <div className="p-4 border rounded-md bg-green-50">
              <h3 className="font-semibold mb-2">Área de Criação</h3>
              <Protect permission="OBRAS_CRIAR" fallback={<span className="text-xs text-red-500">Você não pode criar obras.</span>}>
                <Button className="bg-green-600 hover:bg-green-700">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Nova Obra (Requer: OBRAS_CRIAR)
                </Button>
              </Protect>
            </div>

            {/* TESTE 2: Botão que deve SUMIR (Permissão Crítica) */}
            <div className="p-4 border rounded-md bg-red-50">
              <h3 className="font-semibold mb-2">Zona de Perigo</h3>
              <Protect 
                permission="FINANCEIRO_EXCLUIR_TUDO" 
                fallback={
                  <div className="flex items-center text-gray-400 gap-2">
                    <Lock className="h-4 w-4" />
                    <span>Botão oculto por falta de permissão.</span>
                  </div>
                }
              >
                <Button variant="destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Deletar Todo o Financeiro
                </Button>
              </Protect>
            </div>

          </CardContent>
        </Card>
      </div>
    </div>
  )
}