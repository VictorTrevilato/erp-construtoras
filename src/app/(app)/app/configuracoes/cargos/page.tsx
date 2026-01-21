import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { getRoles } from "@/app/actions/roles"
import { getUserPermissions } from "@/app/actions/permissions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { PlusCircle, Users } from "lucide-react"
import Link from "next/link"
import { RoleActions } from "./_components/role-actions"

export default async function RolesPage() {
  const session = await auth()
  if (!session) redirect("/login")

  const [roles, userPermissions] = await Promise.all([
    getRoles(),
    getUserPermissions()
  ])

  // Lógica Estrita: Apenas exibe se tiver a permissão exata no banco.
  const canCreate = userPermissions.includes("CARGOS_CRIAR")

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cargos e Permissões</h1>
          <p className="text-muted-foreground">
            Defina os papéis dos usuários e o que cada um pode acessar no sistema.
          </p>
        </div>

        {/* Se não tiver permissão, o botão nem aparece no DOM */}
        {canCreate && (
          <Button asChild>
            <Link href="/app/configuracoes/cargos/novo">
              <PlusCircle className="mr-2 h-4 w-4" />
              Novo Cargo
            </Link>
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cargos Cadastrados</CardTitle>
          <CardDescription>
            Gerencie os níveis de acesso da sua organização.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome do Cargo</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Usuários</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Nenhum cargo encontrado. Crie o primeiro!
                  </TableCell>
                </TableRow>
              ) : (
                roles.map((role) => (
                  <TableRow key={role.id.toString()}>
                    <TableCell className="font-medium">{role.nome}</TableCell>
                    <TableCell>{role.descricao || "-"}</TableCell>
                    <TableCell>
                      <Badge variant={role.interno ? "secondary" : "outline"}>
                        {role.interno ? "Interno (Equipe)" : "Externo (Portal)"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Users className="h-3 w-3" />
                        <span className="text-xs">{role._count.ycUsuariosEmpresas}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <RoleActions 
                        roleId={role.id.toString()} 
                        userCount={role._count.ycUsuariosEmpresas}
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}