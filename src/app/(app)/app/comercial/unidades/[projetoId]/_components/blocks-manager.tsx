"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table"
import { Trash2, Plus, Layers } from "lucide-react"
import { useState, useTransition } from "react"
import { saveBlock, deleteBlock } from "@/app/actions/commercial-units"
import { toast } from "sonner"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface Block {
  id: string
  nome: string
  codigo?: string | null
}

export function BlocksManager({ projetoId, blocks }: { projetoId: string, blocks: Block[] }) {
  const [isPending, startTransition] = useTransition()
  
  const [newName, setNewName] = useState("")
  const [newCode, setNewCode] = useState("")
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const handleAdd = async () => {
    if(!newName || !newCode) return
    
    const formData = new FormData()
    formData.append("nome", newName)
    formData.append("codigo", newCode)

    startTransition(async () => {
      const res = await saveBlock(projetoId, null, formData)
      if(res.success) {
        toast.success(res.message)
        setNewName("")
        setNewCode("")
      } else {
        toast.error(res.message)
      }
    })
  }

  const confirmDelete = async () => {
    if (!deleteId) return
    startTransition(async () => {
        const res = await deleteBlock(deleteId)
        if(res.success) toast.success(res.message)
        else toast.error(res.message)
        setDeleteId(null)
    })
  }

  return (
    <>
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Layers className="w-4 h-4" /> Gerenciar Blocos
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gerenciar Blocos / Torres</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Form de Adição */}
            <div className="flex gap-2 items-end">
              <div className="space-y-1 flex-1">
                <Label>Nome (Ex: Torre A)</Label>
                <Input value={newName} onChange={e => setNewName(e.target.value)} />
              </div>
              <div className="space-y-1 w-24">
                <Label>Cód. (TR-A)</Label>
                <Input value={newCode} onChange={e => setNewCode(e.target.value)} />
              </div>
              <Button onClick={handleAdd} disabled={isPending || !newName}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            {/* Lista */}
            <div className="border rounded-md max-h-[300px] overflow-y-auto">
              <Table>
                <TableBody>
                  {blocks.map(b => (
                      <TableRow key={b.id}>
                          <TableCell>{b.nome}</TableCell>
                          <TableCell className="text-muted-foreground text-xs">{b.codigo || "-"}</TableCell>
                          <TableCell className="text-right">
                              <Button variant="ghost" size="icon" onClick={() => setDeleteId(b.id)} disabled={isPending}>
                                  <Trash2 className="w-4 h-4 text-red-500" />
                              </Button>
                          </TableCell>
                      </TableRow>
                  ))}
                  {blocks.length === 0 && (
                      <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">Nenhum bloco cadastrado.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmação de Exclusão */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Bloco?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este bloco? 
              <br/><strong>Atenção:</strong> Se houver unidades vinculadas, a exclusão será bloqueada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}