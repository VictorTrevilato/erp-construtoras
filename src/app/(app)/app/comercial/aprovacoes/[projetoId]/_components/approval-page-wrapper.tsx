"use client"

import { ApprovalProvider } from "./approval-context"
import { ApprovalList } from "./approval-list"
import { ApprovalDetail } from "./approval-detail"
import { ApprovalDetail as ApprovalType } from "@/app/actions/commercial-approvals"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"
import { useRouter } from "next/navigation"
import { useTransition } from "react"
import { cn } from "@/lib/utils"

export function ApprovalPageWrapper({ proposals }: { proposals: ApprovalType[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const handleRefresh = () => {
    startTransition(() => {
        router.refresh()
    })
  }

  return (
    <ApprovalProvider proposals={proposals}>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
            
            {/* ESQUERDA: LISTA 
                - h-full: Ocupa toda altura disponível
                - overflow-hidden: Impede que a lista estoure o layout da página
                - flex-col: Organiza Header em cima, Lista em baixo
            */}
            <div className="lg:col-span-4 border-r pr-6 hidden lg:flex flex-col h-full overflow-hidden">
                
                {/* Header da Lista (Fixo) */}
                <div className="mb-4 flex items-end justify-between shrink-0 pt-1">
                    <div>
                        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Pendências</h3>
                        <p className="text-xs text-muted-foreground">{proposals.length} propostas aguardando</p>
                    </div>
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={handleRefresh}
                        disabled={isPending}
                        className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                        title="Atualizar lista"
                    >
                        <RefreshCw className={cn("w-4 h-4", isPending && "animate-spin")} />
                    </Button>
                </div>
                
                {/* Lista de Cards (Scrollável) */}
                <ApprovalList />
            </div>

            {/* DIREITA: DETALHE */}
            <div className="lg:col-span-8 h-full overflow-hidden">
                <ApprovalDetail />
            </div>
        </div>
    </ApprovalProvider>
  )
}