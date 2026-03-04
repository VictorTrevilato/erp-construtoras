import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowUpRight, MapPin } from "lucide-react"

const projects = [
  {
    title: "Edifício Hyde",
    location: "Jardim Botânico",
    status: "Lançamento",
    statusColor: "bg-primary text-primary-foreground hover:bg-primary/90",
    imageColor: "bg-primary/20",
    progress: "100%"
  },
  {
    title: "Edifício Alth",
    location: "Jardim Mosteiro",
    status: "Em Breve",
    statusColor: "bg-warning text-warning-foreground hover:bg-warning/90",
    imageColor: "bg-muted",
    progress: "0%"
  },
  {
    title: "Edifício Cohre",
    location: "Jardim America",
    status: "Em Breve",
    statusColor: "bg-warning text-warning-foreground hover:bg-warning/90",
    imageColor: "bg-secondary/20",
    progress: "0%"
  }
]

export function ProjectSpotlight() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold tracking-tight text-foreground">Nossos Empreendimentos</h3>
        <Button variant="link" className="text-primary h-auto p-0 text-sm">
          Ver todos
        </Button>
      </div>
      
      <div className="grid gap-4 md:grid-cols-3">
        {projects.map((project, i) => (
          <Card key={i} className="overflow-hidden group hover:shadow-lg transition-all duration-300 border-border">
            <div className={`h-32 w-full ${project.imageColor} relative`}>
              <div className="absolute top-3 right-3">
                <Badge className={`${project.statusColor} border-0 shadow-sm`}>
                  {project.status}
                </Badge>
              </div>
              <div className="absolute bottom-0 left-0 w-full h-1 bg-muted">
                 <div className="h-full bg-primary" style={{ width: project.progress }}></div>
              </div>
            </div>
            
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-base font-bold text-foreground group-hover:text-primary transition-colors">
                {project.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="flex items-center text-xs text-muted-foreground gap-1">
                <MapPin className="h-3 w-3" />
                {project.location}
              </div>
            </CardContent>
            <CardFooter className="p-4 pt-0">
               <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground h-8 bg-muted/50 hover:bg-muted">
                  Ficha Técnica <ArrowUpRight className="ml-2 h-3 w-3" />
               </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  )
}