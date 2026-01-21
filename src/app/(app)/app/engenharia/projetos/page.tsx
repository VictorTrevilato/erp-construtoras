import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { getProjects } from "@/app/actions/projects"
import { getUserPermissions } from "@/app/actions/permissions"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { MapPin, Building2 } from "lucide-react"
import { ProjectActions } from "./_components/project-actions"

export default async function ProjectsPage() {
  const session = await auth()
  if (!session) redirect("/login")

  const [projects, userPermissions] = await Promise.all([
    getProjects(),
    getUserPermissions()
  ])

  // Lógica Estrita: O usuário DEVE ter a permissão explícita.
  // Não há exceção para e-mail ou cargo "ADMIN" genérico aqui.
  const canCreate = userPermissions.includes("PROJETOS_CRIAR")
  const canEdit = userPermissions.includes("PROJETOS_EDITAR")
  const canDelete = userPermissions.includes("PROJETOS_EXCLUIR")

  const permissions = { canCreate, canEdit, canDelete }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projetos e Obras</h1>
          <p className="text-muted-foreground">
            Gestão de empreendimentos, canteiros de obra e SPEs.
          </p>
        </div>

        <ProjectActions mode="create" permissions={permissions} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Carteira de Projetos</CardTitle>
          <CardDescription>
            Lista de todos os empreendimentos ativos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empreendimento</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Localização</TableHead>
                <TableHead>Escopo Vinculado</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Nenhum projeto cadastrado.
                  </TableCell>
                </TableRow>
              ) : (
                projects.map((project) => (
                  <TableRow key={project.id}>
                    <TableCell className="font-medium">
                      <div className="flex flex-col">
                        <span>{project.nome}</span>
                        {project.cnpj && <span className="text-[10px] text-muted-foreground">CNPJ: {project.cnpj}</span>}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <Badge variant="outline">{project.tipo}</Badge>
                    </TableCell>

                    <TableCell>
                      <Badge variant={project.status === 'ENTREGUE' ? 'secondary' : 'default'} className="text-[10px]">
                        {project.status}
                      </Badge>
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin className="w-3 h-3" />
                        <span>{project.cidade} / {project.estado}</span>
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Building2 className="w-3 h-3" />
                        <span>{project.escopoNome}</span>
                      </div>
                    </TableCell>

                    <TableCell className="text-right">
                      <ProjectActions 
                        mode="edit" 
                        project={{ id: project.id, nome: project.nome }}
                        permissions={permissions}
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