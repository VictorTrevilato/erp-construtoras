'use client'

import { useState } from "react"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { FileDown, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { GridInstallment } from "./proposal-installments-tab"
import { ProposalFullDetail } from "@/app/actions/commercial-proposals"

// --- TIPAGENS ---
interface PdfCell {
    content: string
    colSpan?: number
    rowSpan?: number
    styles?: {
        halign?: 'left' | 'center' | 'right'
        fontStyle?: 'bold' | 'normal' | 'italic'
        textColor?: [number, number, number] | number | string 
    }
}

type Props = {
    proposal: ProposalFullDetail
    installments: GridInstallment[]
}

const TIPO_MAP: Record<string, string> = {
    'E': 'ENTRADA',
    'M': 'MENSAL',
    'I': 'INTERMEDIÁRIA',
    'A': 'ANUAL',
    'C': 'CHAVES',
    'F': 'FINANCIAMENTO',
    'O': 'OUTROS'
}

// Helpers
const fmtCurrency = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const fmtDate = (d: string | Date) => {
    if (!d) return '-'
    const date = new Date(d)
    date.setMinutes(date.getMinutes() + date.getTimezoneOffset())
    return date.toLocaleDateString('pt-BR')
}

const loadImage = (url: string): Promise<HTMLImageElement | null> => {
    return new Promise((resolve) => {
        const cleanUrl = String(url).trim()
        if (!cleanUrl || cleanUrl === 'null' || cleanUrl === 'undefined') return resolve(null)
        const img = new Image()
        img.crossOrigin = 'Anonymous'
        img.onload = () => resolve(img)
        img.onerror = () => resolve(null)
        img.src = cleanUrl
    })
}

export function ExportPdfInstallmentsButton({ proposal, installments }: Props) {
    const [isGenerating, setIsGenerating] = useState(false)

    const handleExport = async () => {
        if (installments.length === 0) return toast.error("Não há parcelas na grade para gerar o PDF.")

        setIsGenerating(true)

        try {
            const doc = new jsPDF("p")
            const pageWidth = doc.internal.pageSize.getWidth()
            let finalY = 15

            // --- EXTRAÇÃO SEGURA DOS DADOS (Sem 'any') ---
            type SafeProposal = ProposalFullDetail & { lead: { origemDescricao?: string | null } }
            const pSafe = proposal as unknown as SafeProposal
            
            const leadNome = pSafe.lead?.nome || 'Não informado'
            const leadTelefone = pSafe.lead?.telefone || '-'
            const leadOrigemDescricao = pSafe.lead?.origemDescricao || '-'
            const leadOrigem = pSafe.lead?.origem || '-'
            
            const blocoNome = pSafe.unidade?.bloco || ''
            const numUnidade = pSafe.unidade?.numero || ''
            const unitDisplay = blocoNome ? `${blocoNome} - ${numUnidade}` : (numUnidade ? String(numUnidade) : 'Não identificada')
            
            const area = pSafe.unidade?.areaPrivativaTotal || 0
            const valorTotalProposta = proposal.valorProposta || 0

            const nomeDoProjeto = pSafe.projeto?.nome || "Projeto"
            const finalLogoUrl = pSafe.projeto?.logoUrl || null

            // --- 1. CABEÇALHO ---
            const textStartX = finalLogoUrl ? 42 : 14
            if (finalLogoUrl) {
                const img = await loadImage(finalLogoUrl)
                if (img) {
                    const imgWidth = 22
                    const imgHeight = (img.height * imgWidth) / img.width
                    doc.addImage(img, 'PNG', 14, 10, imgWidth, imgHeight)
                }
            }

            doc.setFontSize(16)
            doc.setTextColor(15, 23, 42)
            doc.text("Fluxo de Pagamento Detalhado", textStartX, finalY)

            finalY += 6
            doc.setFontSize(10)
            doc.setTextColor(100, 116, 139)
            doc.text(`Empreendimento: ${nomeDoProjeto}`, textStartX, finalY)

            const dateStr = `Gerado em: ${new Date().toLocaleDateString('pt-BR')}`
            doc.setFontSize(8)
            doc.text(dateStr, pageWidth - 14, 15, { align: "right" })

            finalY += 25 

            // --- 2. DADOS DA NEGOCIAÇÃO (RESUMO) ---
            doc.setFontSize(12)
            doc.setTextColor(15, 23, 42)
            doc.text("Resumo da Operação", 14, finalY)

            autoTable(doc, {
                startY: finalY + 4,
                body: [
                    [{ content: 'Comprador:', styles: { fontStyle: 'bold' } }, leadNome, { content: 'Unidade:', styles: { fontStyle: 'bold' } }, unitDisplay],
                    [{ content: 'Telefone:', styles: { fontStyle: 'bold' } }, leadTelefone, { content: 'Área Privativa:', styles: { fontStyle: 'bold' } }, `${area} m²`],
                    [{ content: 'Origem:', styles: { fontStyle: 'bold' } }, leadOrigem, { content: 'Valor Proposto:', styles: { fontStyle: 'bold' } }, fmtCurrency(valorTotalProposta)],
                    [{ content: 'Descrição:', styles: { fontStyle: 'bold' } }, leadOrigemDescricao, { content: 'Total na Grade:', styles: { fontStyle: 'bold' } }, fmtCurrency(installments.reduce((acc, curr) => acc + curr.valor, 0))]
                ],
                theme: 'plain',
                styles: { fontSize: 10, cellPadding: 2, textColor: [51, 65, 85] }
            })

            finalY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15

            // --- 3. GRADE DE PARCELAS ---
            doc.setFontSize(12)
            doc.setTextColor(15, 23, 42)
            doc.text("Grade de Parcelas", 14, finalY)

            const customHead = [["Nº", "TIPO", "VENCIMENTO", "VALOR", "% REF."]]
            
            const totalGrade = installments.reduce((acc, curr) => acc + curr.valor, 0)

            const customBody: (string | PdfCell)[][] = installments.map((inst, index) => {
                const percent = valorTotalProposta > 0 ? (inst.valor / valorTotalProposta) * 100 : 0
                return [
                    (index + 1).toString(),
                    TIPO_MAP[inst.tipo] || 'OUTROS',
                    fmtDate(inst.vencimento),
                    fmtCurrency(inst.valor),
                    `${percent.toFixed(2)}%`
                ]
            })

            customBody.push([
                { content: 'TOTAL DA GRADE', colSpan: 3, styles: { halign: 'right', fontStyle: 'bold' } },
                { content: fmtCurrency(totalGrade), styles: { fontStyle: 'bold' } },
                { content: '100.00%', styles: { fontStyle: 'bold' } }
            ])

            autoTable(doc, {
                startY: finalY + 4,
                head: customHead,
                body: customBody,
                theme: 'grid',
                headStyles: { fillColor: [248, 250, 252], textColor: [15, 23, 42], fontStyle: 'bold', halign: 'center', lineWidth: 0.1, lineColor: [226, 232, 240] },
                styles: { fontSize: 9, cellPadding: 3, lineWidth: 0.1, lineColor: [226, 232, 240] },
                columnStyles: {
                    0: { halign: 'center', fontStyle: 'bold' }, // Index
                    1: { halign: 'center' }, // Tipo
                    2: { halign: 'center' }, // Vencimento
                    3: { halign: 'center', fontStyle: 'bold' }, // Valor
                    4: { halign: 'center' } // % Ref
                }
            })

            finalY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 25

            // --- 4. ASSINATURAS ---
            if (finalY > doc.internal.pageSize.getHeight() - 40) {
                doc.addPage()
                finalY = 30
            }

            doc.setFontSize(9)
            doc.setTextColor(100, 116, 139)
            doc.text("Este documento é uma simulação e está sujeito à aprovação de crédito e disponibilidade da unidade.", 14, finalY)

            finalY += 30
            const halfWidth = pageWidth / 2

            doc.line(20, finalY, halfWidth - 10, finalY)
            doc.text("Assinatura do Comprador", (halfWidth + 10) / 2, finalY + 5, { align: "center" })

            doc.line(halfWidth + 10, finalY, pageWidth - 20, finalY)
            doc.text("Assinatura do Responsável", halfWidth + ((halfWidth - 10) / 2), finalY + 5, { align: "center" })

            // --- NOME DO ARQUIVO FORMATADO ---
            const rawFileName = `FLUXO_${nomeDoProjeto}_UN${numUnidade}_${leadNome}`
            const formattedFileName = rawFileName.replace(/\s+/g, '_').toUpperCase() + '.pdf'

            doc.save(formattedFileName)

        } catch (error) {
            console.error("Erro ao gerar PDF:", error)
        } finally {
            setIsGenerating(false)
        }
    }

    return (
        <Button 
            variant="outline" 
            onClick={handleExport} 
            disabled={isGenerating || installments.length === 0} 
            className="w-full shadow-sm h-10 border-primary/30 text-primary hover:bg-primary/5 hover:text-primary gap-2"
        >
            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
            {isGenerating ? "Gerando..." : "Baixar Fluxo em PDF"}
        </Button>
    )
}