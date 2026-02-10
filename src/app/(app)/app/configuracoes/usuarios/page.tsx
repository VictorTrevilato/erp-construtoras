import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { getUsers } from "@/app/actions/users"
import { getRoles } from "@/app/actions/roles"
import { getScopes } from "@/app/actions/scopes"
import { getAllSystemPermissions } from "@/app/actions/permissions"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Shield, MapPin } from "lucide-react"
import { UserActions } from "./_components/user-actions"

export default async function UsersPage() {
  const session = await auth()
  if (!session) redirect("/login")

  // [CORREÇÃO] Renomeamos para 'rawRoles' para tratar o dado bruto abaixo
  const [users, rawRoles, scopes, allPermissions] = await Promise.all([
    getUsers(),
    getRoles(),
    getScopes(),
    getAllSystemPermissions()
  ])

  // [CORREÇÃO] Convertemos o BigInt para String
  const roles = rawRoles.map(role => ({
    id: role.id.toString(),
    nome: role.nome
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Usuários e Acessos</h1>
          <p className="text-muted-foreground">
            Gerencie quem tem acesso ao sistema e quais escopos podem visualizar.
          </p>
        </div>

        <UserActions 
          mode="create" 
          roles={roles} // Agora passamos a lista tratada (id: string)
          scopes={scopes} 
          allPermissions={allPermissions}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Equipe Cadastrada</CardTitle>
          <CardDescription>
            Usuários ativos neste ambiente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[300px]">Usuário</TableHead>
                <TableHead>Cargo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Escopos</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Nenhum usuário encontrado além de você. Convide sua equipe!
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.usuarioEmpresaId}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback className="bg-blue-100 text-blue-700 font-bold">
                            {user.nome.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="font-medium">{user.nome}</span>
                          <span className="text-xs text-muted-foreground">{user.email}</span>
                        </div>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <Badge variant="outline" className="gap-1">
                        <Shield className="w-3 h-3" />
                        {user.cargoNome}
                      </Badge>
                    </TableCell>

                    <TableCell>
                      <Badge variant={user.ativo ? "secondary" : "destructive"}>
                        {user.ativo ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground" title="Quantidade de escopos permitidos">
                        <MapPin className="w-4 h-4" />
                        <span>{user.escoposAtuais.length} Escopos</span>
                      </div>
                    </TableCell>

                    <TableCell className="text-right">
                      <UserActions 
                        mode="edit" 
                        user={user} 
                        roles={roles} // Lista tratada aqui também
                        scopes={scopes} 
                        allPermissions={allPermissions}
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