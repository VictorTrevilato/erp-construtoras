"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { 
  Search, 
  UserPlus, 
  Filter, 
  UserStar, 
  UserCheck, 
  UserCog, 
  ArrowUp, 
  ArrowDown, 
  ArrowUpDown 
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { PaginationSelector } from "@/components/shared/pagination-selector"
import { PersonLegalActions } from "./person-legal-actions"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface PersonLegal {
  id: string
  nome: string // Razão Social
  nomeFantasia: string | null
  documento: string // CNPJ
  email: string | null
  telefone: string | null
  cidade: string | null
  uf: string | null
  isCliente: boolean
  isImobiliaria: boolean
  isFornecedor: boolean
  sysCreatedAt: string
}

interface Props {
  initialData: PersonLegal[]
  totalItems: number
}

export function PersonLegalClient({ initialData, totalItems }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [searchValue, setSearchValue] = useState(searchParams.get("search") || "")
  const isFirstRender = useRef(true)

  const currentSortBy = searchParams.get("sortBy")
  const currentSortDir = searchParams.get("sortDir") as "asc" | "desc" | null

  const currentPage = Number(searchParams.get("page")) || 1
  const pageSize = Number(searchParams.get("pageSize")) || 10

  const getInitials = (name: string) => {
    const parts = name.trim().split(" ")
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }

  const handleSort = (field: string) => {
    const params = new URLSearchParams(searchParams.toString())
    
    if (currentSortBy !== field) {
      params.set("sortBy", field)
      params.set("sortDir", "asc")
    } else {
      if (currentSortDir === "asc") {
        params.set("sortDir", "desc")
      } else {
        params.delete("sortBy")
        params.delete("sortDir")
      }
    }

    router.push(`?${params.toString()}`, { scroll: false })
  }

  const renderSortIcon = (field: string) => {
    if (!currentSortBy && field === "id") return <ArrowDown className="ml-2 h-3 w-3 text-primary" />
    if (currentSortBy !== field) return <ArrowUpDown className="ml-2 h-3 w-3 opacity-30" />
    if (currentSortDir === "asc") return <ArrowUp className="ml-2 h-3 w-3 text-primary" />
    if (currentSortDir === "desc") return <ArrowDown className="ml-2 h-3 w-3 text-primary" />
    return <ArrowUpDown className="ml-2 h-3 w-3 opacity-30" />
  }

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
  
    const delayDebounceFn = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString())
      
      if (searchValue !== (searchParams.get("search") || "")) {
        if (searchValue) params.set("search", searchValue)
        else params.delete("search")
        
        params.set("page", "1")
        router.push(`?${params.toString()}`, { scroll: false })
        router.refresh() 
      }
    }, 500)
  
    return () => clearTimeout(delayDebounceFn)
  }, [searchValue, router, searchParams])

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-card p-4 rounded-lg border shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar por Razão Social, Nome Fantasia ou CNPJ..." 
            className="pl-9 w-full"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Filter className="h-4 w-4" /> Filtros
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Filtrar por Perfil</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem 
                checked={searchParams.get("isCliente") === "true"}
                onCheckedChange={(val) => {
                  const p = new URLSearchParams(searchParams.toString())
                  if (val) p.set("isCliente", "true")
                  else p.delete("isCliente")
                  p.set("page", "1")
                  router.push(`?${p.toString()}`, { scroll: false })
                }}
              >
                Clientes
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem 
                checked={searchParams.get("isImobiliaria") === "true"}
                onCheckedChange={(val) => {
                  const p = new URLSearchParams(searchParams.toString())
                  if (val) p.set("isImobiliaria", "true")
                  else p.delete("isImobiliaria")
                  p.set("page", "1")
                  router.push(`?${p.toString()}`, { scroll: false })
                }}
              >
                Imobiliárias
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem 
                checked={searchParams.get("isFornecedor") === "true"}
                onCheckedChange={(val) => {
                  const p = new URLSearchParams(searchParams.toString())
                  if (val) p.set("isFornecedor", "true")
                  else p.delete("isFornecedor")
                  p.set("page", "1")
                  router.push(`?${p.toString()}`, { scroll: false })
                }}
              >
                Fornecedores
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button onClick={() => router.push("/app/cadastros/pessoas-juridicas/novo")} className="gap-2">
            <UserPlus className="h-4 w-4" /> Cadastrar
          </Button>
        </div>
      </div>

      <div className="rounded-md border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead 
                className="font-bold cursor-pointer hover:text-primary transition-colors w-[50px]"
                onClick={() => handleSort("id")}
              >
                <div className="flex items-center justify-center">
                  Nº {renderSortIcon("id")}
                </div>
              </TableHead>
              <TableHead 
                className="font-bold cursor-pointer hover:text-primary transition-colors"
                onClick={() => handleSort("nome")}
              >
                <div className="flex items-center">Nome {renderSortIcon("nome")}</div>
              </TableHead>
              <TableHead className="font-bold">Contato</TableHead>
              <TableHead className="font-bold">Localização</TableHead>
              <TableHead className="font-bold text-center">Vínculos</TableHead>
              <TableHead className="w-[80px] text-right"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  Nenhuma pessoa jurídica encontrada.
                </TableCell>
              </TableRow>
            ) : (
              initialData.map((person) => (
                <TableRow key={person.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="font-mono text-xs text-muted-foreground text-center">
                    #{person.id.padStart(4, '0')}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9 border">
                        <AvatarFallback className="text-xs font-bold bg-primary/5 text-primary rounded-md">
                          {getInitials(person.nomeFantasia || person.nome)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="font-bold text-foreground leading-tight truncate max-w-[250px]">
                          {person.nomeFantasia || person.nome}
                        </span>
                        <span className="text-[11px] text-muted-foreground font-mono">
                          {/* Máscara de CNPJ na listagem */}
                          {person.documento.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5")}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col text-sm">
                      <span className="truncate max-w-[150px]">{person.telefone || "-"}</span>
                      <span className="text-muted-foreground text-xs">{person.email || "-"}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">
                      {person.cidade ? `${person.cidade} / ${person.uf}` : "Não informado"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-2">
                      <TooltipProvider delayDuration={100}>
                        {person.isCliente && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="h-8 w-8 rounded-full bg-success/10 flex items-center justify-center text-success border border-success/20 cursor-help">
                                <UserStar className="w-4 h-4" />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>Cliente</TooltipContent>
                          </Tooltip>
                        )}
                        {person.isImobiliaria && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="h-8 w-8 rounded-full bg-warning/10 flex items-center justify-center text-warning border border-warning/20 cursor-help">
                                <UserCheck className="w-4 h-4" />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>Imobiliária</TooltipContent>
                          </Tooltip>
                        )}
                        {person.isFornecedor && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="h-8 w-8 rounded-full bg-info/10 flex items-center justify-center text-info border border-info/20 cursor-help">
                                <UserCog className="w-4 h-4" />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>Fornecedor</TooltipContent>
                          </Tooltip>
                        )}
                      </TooltipProvider>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <PersonLegalActions id={person.id} nome={person.nomeFantasia || person.nome} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        
        <PaginationSelector 
          totalItems={totalItems} 
          currentPage={currentPage} 
          itemsPerPage={pageSize} 
        />
      </div>
    </div>
  )
}