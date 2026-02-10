import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CalendarDays, Megaphone, PartyPopper, Info } from "lucide-react"

export function CompanyWall() {
  const notices = [
    {
      id: 1,
      type: "hr",
      icon: PartyPopper,
      color: "text-pink-600 bg-pink-50",
      title: "Aniversariantes do Mês",
      content: "Confira a lista dos colaboradores que sopram as velinhas em Fevereiro! Teremos bolo na copa dia 25.",
      date: "Hoje, 09:00"
    },
    {
      id: 2,
      type: "general",
      icon: Megaphone,
      color: "text-blue-600 bg-blue-50",
      title: "Nova Política da Empresa",
      content: "A diretoria atualizou as diretrizes para o trabalho híbrido. Acesse o documento no drive compartilhado.",
      date: "Ontem"
    },
    {
      id: 3,
      type: "event",
      icon: CalendarDays,
      color: "text-orange-600 bg-orange-50",
      title: "Treinamento de Segurança",
      content: "Obrigatório para todas as equipes de engenharia. Sala de reuniões 2.",
      date: "12/02 - 14:00"
    },
    {
      id: 4,
      type: "it",
      icon: Info,
      color: "text-slate-600 bg-slate-100",
      title: "Manutenção no Servidor",
      content: "O sistema passará por instabilidade programada neste sábado à noite.",
      date: "Aviso Técnico"
    }
  ]

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Megaphone className="h-5 w-5 text-blue-600" />
          Mural de Avisos
        </CardTitle>
        <CardDescription>Fique por dentro do que acontece na empresa.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {notices.map((item) => (
            <div key={item.id} className="flex gap-4 items-start group">
              <div className={`mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${item.color}`}>
                <item.icon className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium leading-none group-hover:text-blue-600 transition-colors cursor-pointer">
                  {item.title}
                </p>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {item.content}
                </p>
                <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                  {item.date}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}