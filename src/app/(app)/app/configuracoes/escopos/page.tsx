import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { getScopes } from "@/app/actions/scopes"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ScopeTree } from "./_components/scope-tree"

export default async function ScopesPage() {
  const session = await auth()
  if (!session) redirect("/login")

  const scopes = await getScopes()

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Escopos de Trabalho</h1>
        <p className="text-muted-foreground">
          Desenhe a hierarquia organizacional da sua empresa (Matriz, Filiais e Obras).
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Estrutura Organizacional</CardTitle>
          <CardDescription>
            Estes escopos serão usados para restringir o acesso aos dados em cada módulo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScopeTree scopes={scopes} />
        </CardContent>
      </Card>
    </div>
  )
}