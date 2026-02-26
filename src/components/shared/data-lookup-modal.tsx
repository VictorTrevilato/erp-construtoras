"use client"

import { useState, useEffect, useCallback } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Loader2, Search, ChevronLeft, ChevronRight } from "lucide-react"

export interface LookupColumn<T> {
    key: keyof T
    label: string
    render?: (item: T) => React.ReactNode
}

interface DataLookupModalProps<T extends { id: string }> {
    isOpen: boolean
    onClose: () => void
    onConfirm: (selectedItems: T[]) => void
    fetchData: (search: string, page: number, limit: number) => Promise<{ data: T[], total: number }>
    columns: LookupColumn<T>[]
    title?: string
    description?: string
    multiSelect?: boolean
    limit?: number
    initialSelected?: T[]
}

export function DataLookupModal<T extends { id: string }>({
    isOpen,
    onClose,
    onConfirm,
    fetchData,
    columns,
    title = "Buscar Registros",
    description = "Selecione os registros desejados.",
    multiSelect = false,
    limit = 10,
    initialSelected
}: DataLookupModalProps<T>) {
    const [data, setData] = useState<T[]>([])
    const [total, setTotal] = useState(0)
    const [isLoading, setIsLoading] = useState(false)
    const [search, setSearch] = useState("")
    const [page, setPage] = useState(1)
    
    const [selectedItems, setSelectedItems] = useState<Map<string, T>>(new Map())
    const [originalIds, setOriginalIds] = useState<Set<string>>(new Set())

    const loadData = useCallback(async (searchTerm: string, currentPage: number) => {
        setIsLoading(true)
        try {
            const res = await fetchData(searchTerm, currentPage, limit)
            setData(res.data)
            setTotal(res.total)
        } catch (error) {
            console.error(error)
        } finally {
            setIsLoading(false)
        }
    }, [fetchData, limit])

    // Preenche a seleção inicial ao abrir
    useEffect(() => {
        if (isOpen) {
            const newMap = new Map<string, T>()
            const oIds = new Set<string>()
            if (initialSelected) {
                initialSelected.forEach(item => {
                    newMap.set(item.id, item)
                    oIds.add(item.id)
                })
            }
            setSelectedItems(newMap)
            setOriginalIds(oIds)
        } else {
            setSearch("")
            setPage(1)
            setSelectedItems(new Map())
            setOriginalIds(new Set())
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen])

    useEffect(() => {
        if (!isOpen) return
        const delayDebounceFn = setTimeout(() => {
            loadData(search, page)
        }, 500)
        return () => clearTimeout(delayDebounceFn)
    }, [search, page, isOpen, loadData])

    const totalPages = Math.ceil(total / limit) || 1

    const handleSelect = (item: T, checked: boolean) => {
        const newMap = new Map(selectedItems)
        if (checked) {
            if (!multiSelect) newMap.clear() 
            newMap.set(item.id, item)
        } else {
            newMap.delete(item.id)
        }
        setSelectedItems(newMap)
    }

    const toggleSelectAll = (checked: boolean) => {
        if (!multiSelect) return
        const newMap = new Map(selectedItems)
        data.forEach(item => {
            if (checked) newMap.set(item.id, item)
            else newMap.delete(item.id)
        })
        setSelectedItems(newMap)
    }

    const handleConfirm = () => {
        onConfirm(Array.from(selectedItems.values()))
        onClose()
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-3xl flex flex-col h-[85vh]">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>{description}</DialogDescription>
                </DialogHeader>

                <div className="relative mt-2">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="Digite para buscar..." 
                        className="pl-9"
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value)
                            setPage(1)
                        }}
                    />
                </div>

                <div className="flex-1 overflow-auto border rounded-md relative mt-2">
                    {isLoading && (
                        <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-10 backdrop-blur-[1px]">
                            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                        </div>
                    )}
                    
                    <Table>
                        <TableHeader className="bg-slate-50 sticky top-0 z-0 shadow-sm">
                            <TableRow>
                                <TableHead className="w-12 text-center">
                                    {multiSelect && (
                                        <Checkbox 
                                            checked={data.length > 0 && data.every(d => selectedItems.has(d.id))}
                                            onCheckedChange={toggleSelectAll}
                                        />
                                    )}
                                </TableHead>
                                {columns.map(col => (
                                    <TableHead key={String(col.key)}>{col.label}</TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.length === 0 && !isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={columns.length + 1} className="text-center py-10 text-muted-foreground">
                                        Nenhum registro encontrado.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                data.map(item => {
                                    const isSelected = selectedItems.has(item.id)
                                    const isInitial = originalIds.has(item.id)

                                    return (
                                        <TableRow 
                                            key={item.id} 
                                            className={`cursor-pointer transition-colors ${isSelected ? (isInitial ? 'bg-amber-50/50 hover:bg-amber-50' : 'bg-blue-50/50 hover:bg-blue-50') : 'hover:bg-slate-50'}`}
                                            onClick={() => handleSelect(item, !isSelected)}
                                        >
                                            <TableCell className="text-center">
                                                <Checkbox 
                                                    checked={isSelected}
                                                    onCheckedChange={(c) => handleSelect(item, !!c)}
                                                    onClick={e => e.stopPropagation()} 
                                                    className={isInitial && isSelected ? "data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500" : ""}
                                                />
                                            </TableCell>
                                            {columns.map(col => (
                                                <TableCell key={String(col.key)}>
                                                    {col.render ? col.render(item) : String(item[col.key] || '')}
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    )
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>

                <div className="flex items-center justify-between mt-4 pt-2 border-t">
                    <div className="text-sm text-muted-foreground flex items-center gap-4">
                        <span>{total} registros • Selecionados: <strong className="text-slate-900">{selectedItems.size}</strong></span>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1">
                            <Button 
                                variant="outline" size="icon" className="h-8 w-8" 
                                disabled={page === 1 || isLoading}
                                onClick={() => setPage(p => p - 1)}
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <span className="text-sm font-medium w-20 text-center">Pág {page} de {totalPages}</span>
                            <Button 
                                variant="outline" size="icon" className="h-8 w-8" 
                                disabled={page === totalPages || isLoading || total === 0}
                                onClick={() => setPage(p => p + 1)}
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                        
                        <div className="flex gap-2">
                            <Button variant="ghost" onClick={onClose}>Cancelar</Button>
                            <Button onClick={handleConfirm}>
                                Confirmar Seleção
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}