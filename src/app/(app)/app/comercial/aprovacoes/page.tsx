import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { getApprovalProjects } from "@/app/actions/commercial-approvals"
import { ApprovalsProjectList } from "./_components/approvals-project-list"

export default async function ApprovalsHubPage() {
    const session = await auth()
    if (!session) redirect("/login")

    const projects = await getApprovalProjects()

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">
                    Aprovações Comerciais
                </h1>
                <p className="text-muted-foreground">
                    Gerencie propostas pendentes e analise a viabilidade financeira dos empreendimentos.
                </p>
            </div>

            <ApprovalsProjectList projects={projects} />
        </div>
    )
}