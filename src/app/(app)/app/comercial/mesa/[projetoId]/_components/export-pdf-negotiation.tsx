'use client'

import { useState } from "react"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { FileDown, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useNegotiation } from "./negotiation-context"
import { NegotiationUnit } from "@/app/actions/commercial-negotiation"
import { toast } from "sonner"

// --- TIPAGENS PARA EVITAR 'any' ---
interface PdfCell {
    content: string
    colSpan?: number
    rowSpan?: number
    styles?: {
        halign?: 'left' | 'center' | 'right'
        fontStyle?: 'bold' | 'normal' | 'italic'
        // Corrigido: Removido o number[] genérico. O Autotable exige a tupla exata de 3 elementos [R, G, B]
        textColor?: [number, number, number] | number | string 
    }
}

type Props = {
    units: NegotiationUnit[]
    projetoNome?: string
    logoUrl?: string | null
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

export function ExportPdfNegotiationButton({ units, projetoNome = "Projeto", logoUrl }: Props) {
    const [isGenerating, setIsGenerating] = useState(false)
    const { selectedUnitId, lead, targetPrice, conditions, standardFlow } = useNegotiation()

    const selectedUnit = units.find(u => u.id === selectedUnitId)

    const handleExport = async () => {
        if (!selectedUnit) return toast.error("Selecione uma unidade para gerar o PDF.")
        if (conditions.length === 0) return toast.error("Monte as condições da proposta antes de gerar.")

        setIsGenerating(true)

        try {
            // Formato 'p' (Portrait / Retrato)
            const doc = new jsPDF("p")
            const pageWidth = doc.internal.pageSize.getWidth()
            let finalY = 15

            // --- 1. CABEÇALHO ---
            const textStartX = logoUrl ? 42 : 14
            if (logoUrl) {
                const img = await loadImage(logoUrl)
                if (img) {
                    const imgWidth = 22
                    const imgHeight = (img.height * imgWidth) / img.width
                    doc.addImage(img, 'PNG', 14, 10, imgWidth, imgHeight)
                }
            }

            doc.setFontSize(16)
            doc.setTextColor(15, 23, 42)
            doc.text("Ficha de Proposta", textStartX, finalY)

            finalY += 6
            doc.setFontSize(10)
            doc.setTextColor(100, 116, 139)
            doc.text(`Empreendimento: ${projetoNome}`, textStartX, finalY)

            const dateStr = `Gerado em: ${new Date().toLocaleDateString('pt-BR')}`
            doc.setFontSize(8)
            doc.text(dateStr, pageWidth - 14, 15, { align: "right" })

            // AUMENTO DO ESPAÇAMENTO APÓS A LOGO
            finalY += 25 

            // --- 2. DADOS DA NEGOCIAÇÃO (RESUMO) ---
            doc.setFontSize(12)
            doc.setTextColor(15, 23, 42)
            doc.text("Resumo da Operação", 14, finalY)

            autoTable(doc, {
                startY: finalY + 4,
                body: [
                    [{ content: 'Comprador:', styles: { fontStyle: 'bold' } }, lead.nome || 'Não informado', { content: 'Unidade:', styles: { fontStyle: 'bold' } }, `${selectedUnit.blocoNome} - ${selectedUnit.unidade}`],
                    [{ content: 'Telefone:', styles: { fontStyle: 'bold' } }, lead.telefone || '-', { content: 'Área Privativa:', styles: { fontStyle: 'bold' } }, `${selectedUnit.areaPrivativa} m²`],
                    [{ content: 'Origem:', styles: { fontStyle: 'bold' } }, lead.origem || '-', { content: 'Valor Tabela:', styles: { fontStyle: 'bold' } }, fmtCurrency(selectedUnit.valorTabela)],
                    [{ content: 'Descrição:', styles: { fontStyle: 'bold' } }, lead.origemDescricao || '-', { content: 'Valor Proposto:', styles: { fontStyle: 'bold' } }, fmtCurrency(targetPrice)],
                ],
                theme: 'plain',
                styles: { fontSize: 10, cellPadding: 2, textColor: [51, 65, 85] }
            })

            // Tipagem segura para ler propriedades injetadas pelo autotable
            finalY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15

            // --- 3. PROPOSTA DO CLIENTE (CONDIÇÕES) ---
            doc.setFontSize(12)
            doc.setTextColor(15, 23, 42)
            doc.text("Fluxo de Pagamento Proposto", 14, finalY)

            const sortedConditions = [...conditions].sort((a, b) => new Date(a.vencimento).getTime() - new Date(b.vencimento).getTime())
            const totalProposto = sortedConditions.reduce((acc, curr) => acc + (curr.valorParcela * curr.qtdeParcelas), 0)

            // TÍTULOS ABREVIADOS
            const customHead = [["TIPO", "1º VENC.", "Nº PARC.", "VALOR", "TOTAL", "%"]]
            
            // Tipagem do corpo da tabela para aceitar strings e objetos complexos da nossa interface
            const customBody: (string | PdfCell)[][] = sortedConditions.map(c => {
                const totalLinha = c.valorParcela * c.qtdeParcelas
                const percent = targetPrice > 0 ? (totalLinha / targetPrice) * 100 : 0
                return [
                    c.tipo.toUpperCase(),
                    fmtDate(c.vencimento),
                    c.qtdeParcelas.toString(),
                    fmtCurrency(c.valorParcela),
                    fmtCurrency(totalLinha),
                    `${percent.toFixed(2)}%`
                ]
            })

            // Linha de Totalizador sem o atalho 'as any'
            customBody.push([
                { content: 'TOTAL PROPOSTO', colSpan: 4, styles: { halign: 'right', fontStyle: 'bold' } },
                { content: fmtCurrency(totalProposto), styles: { fontStyle: 'bold' } },
                { content: '100.00%', styles: { fontStyle: 'bold' } }
            ])

            autoTable(doc, {
                startY: finalY + 4,
                head: customHead,
                body: customBody,
                theme: 'grid',
                // BORDAS E CENTRALIZAÇÃO APLICADAS NO CABEÇALHO
                headStyles: { fillColor: [248, 250, 252], textColor: [15, 23, 42], fontStyle: 'bold', halign: 'center', lineWidth: 0.1, lineColor: [226, 232, 240] },
                // AUMENTADO TAMANHO DA FONTE PARA 10
                styles: { fontSize: 10, cellPadding: 3, lineWidth: 0.1, lineColor: [226, 232, 240] },
                columnStyles: {
                    0: { halign: 'left' },
                    1: { halign: 'center' }, // DATA CENTRALIZADA
                    2: { halign: 'center' },
                    3: { halign: 'right' },
                    4: { halign: 'right', fontStyle: 'bold' },
                    5: { halign: 'right' }
                }
            })

            // Tipagem segura
            finalY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15

            // --- 4. CONDIÇÃO PADRÃO (REFERÊNCIA) ---
            if (standardFlow && standardFlow.length > 0) {
                doc.setFontSize(12)
                doc.setTextColor(15, 23, 42)
                doc.text("Condição Tabela Padrão (Referência)", 14, finalY)

                // TÍTULOS ABREVIADOS
                const standardHead = [["TIPO", "1º VENC.", "Nº PARC.", "VALOR", "TOTAL", "%"]]
                const standardBody = standardFlow.map(f => [
                    f.tipo.toUpperCase(),
                    fmtDate(f.primeiroVencimento),
                    f.qtdeParcelas.toString(),
                    fmtCurrency(f.valorParcela),
                    fmtCurrency(f.valorTotal),
                    `${Number(f.percentual).toFixed(2)}%`
                ])

                autoTable(doc, {
                    startY: finalY + 4,
                    head: standardHead,
                    body: standardBody,
                    theme: 'grid',
                    // BORDAS E CENTRALIZAÇÃO APLICADAS NO CABEÇALHO
                    headStyles: { fillColor: [241, 245, 249], textColor: [100, 116, 139], fontStyle: 'bold', halign: 'center', lineWidth: 0.1, lineColor: [226, 232, 240] }, 
                    // AUMENTADO TAMANHO DA FONTE PARA 10 (IGUAL A DE CIMA)
                    styles: { fontSize: 10, cellPadding: 3, textColor: [100, 116, 139], lineWidth: 0.1, lineColor: [226, 232, 240] },
                    columnStyles: {
                        0: { halign: 'left' },
                        1: { halign: 'center' }, // DATA CENTRALIZADA
                        2: { halign: 'center' },
                        3: { halign: 'right' },
                        4: { halign: 'right' },
                        5: { halign: 'right' }
                    }
                })

                // Tipagem segura
                finalY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 20
            } else {
                finalY += 10
            }

            // --- 5. ASSINATURAS ---
            if (finalY > doc.internal.pageSize.getHeight() - 40) {
                doc.addPage()
                finalY = 30
            }

            doc.setFontSize(9)
            doc.setTextColor(100, 116, 139)
            doc.text("Este documento é uma simulação e está sujeito à aprovação de crédito e disponibilidade da unidade.", 14, finalY)

            finalY += 30
            const halfWidth = pageWidth / 2

            // Linha do Cliente
            doc.line(20, finalY, halfWidth - 10, finalY)
            doc.text("Assinatura do Comprador", (halfWidth + 10) / 2, finalY + 5, { align: "center" })

            // Linha do Corretor/Construtora
            doc.line(halfWidth + 10, finalY, pageWidth - 20, finalY)
            doc.text("Corretor / Aprovação", halfWidth + ((halfWidth - 10) / 2), finalY + 5, { align: "center" })

            // --- NOME DO ARQUIVO FORMATADO ---
            const rawFileName = `PROPOSTA_${projetoNome}_UN${selectedUnit.unidade}_${lead.nome || 'CLIENTE'}`
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
            disabled={isGenerating || !selectedUnit} 
            className="border-primary/30 text-primary hover:bg-primary/5 hover:text-primary gap-2"
        >
            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
            {isGenerating ? "Gerando..." : "Baixar PDF"}
        </Button>
    )
}