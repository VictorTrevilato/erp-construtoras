import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CalendarDays, Megaphone, PartyPopper, Info } from "lucide-react"

export function CompanyWall() {
  const notices = [
    {
      id: 1,
      type: "hr",
      icon: PartyPopper,
      color: "text-primary bg-primary/10",
      title: "Aniversariantes do Mês",
      content: "Confira a lista dos colaboradores que sopram as velinhas em Fevereiro! Teremos bolo na copa dia 25.",
      date: "Hoje, 09:00"
    },
    {
      id: 2,
      type: "general",
      icon: Megaphone,
      color: "text-info bg-info/10",
      title: "Nova Política da Empresa",
      content: "A diretoria atualizou as diretrizes para o trabalho híbrido. Acesse o documento no drive compartilhado.",
      date: "Ontem"
    },
    {
      id: 3,
      type: "event",
      icon: CalendarDays,
      color: "text-warning bg-warning/10",
      title: "Treinamento de Segurança",
      content: "Obrigatório para todas as equipes de engenharia. Sala de reuniões 2.",
      date: "12/02 - 14:00"
    },
    {
      id: 4,
      type: "it",
      icon: Info,
      color: "text-muted-foreground bg-muted",
      title: "Manutenção no Servidor",
      content: "O sistema passará por instabilidade programada neste sábado à noite.",
      date: "Aviso Técnico"
    }
  ]

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Megaphone className="h-5 w-5 text-primary" />
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
                <p className="text-sm font-medium leading-none group-hover:text-primary transition-colors cursor-pointer">
                  {item.title}
                </p>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {item.content}
                </p>
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
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