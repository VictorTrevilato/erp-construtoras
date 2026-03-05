'use client'

import { useState } from "react"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { FileDown, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { NegotiationUnit } from "@/app/actions/commercial-negotiation"

// Tipagens
type Flow = {
    tipo: string
    percentual: number
    qtdeParcelas: number
    periodicidade: number
}

type ExportPdfButtonProps = {
    units: NegotiationUnit[]
    flows: Flow[]
    projetoNome?: string
    tabelaCodigo?: string | null
    logoUrl?: string | null
}

// Helpers de formatação
const fmtCurrency = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const fmtDecimal = (val: number, digits = 2) => val.toLocaleString('pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits })

const formatStatusLabel = (status: string) => {
    const map: Record<string, string> = {
        'DISPONIVEL': 'DISPONÍVEL',
        'RESERVADO': 'RESERVADO',
        'VENDIDO': 'VENDIDO',
        'EM_ANALISE': 'EM ANÁLISE'
    }
    return map[status] || status
}

// Helper para traduzir o status em cores RGB para o jsPDF
const getPdfStatusColor = (statusLabel: string): [number, number, number] => {
    switch (statusLabel) {
        case 'DISPONÍVEL': return [34, 197, 94] // success (green-500)
        case 'VENDIDO': return [239, 68, 68] // destructive (red-500)
        case 'RESERVADO': return [245, 158, 11] // warning (amber-500)
        case 'EM ANÁLISE': return [59, 130, 246] // info (blue-500)
        default: return [100, 116, 139] // muted (slate-500)
    }
}

// Helper para converter imagem de URL para Base64 (necessário para o jsPDF evitar erros de CORS)
const loadImage = (url: string): Promise<HTMLImageElement | null> => {
    return new Promise((resolve) => {
        const img = new Image()
        img.crossOrigin = 'Anonymous'
        img.onload = () => resolve(img)
        img.onerror = () => resolve(null)
        img.src = url
    })
}

export function ExportPdfButton({ units, flows, projetoNome = "Projeto", tabelaCodigo, logoUrl }: ExportPdfButtonProps) {
    const [isGenerating, setIsGenerating] = useState(false)

    const handleExport = async () => {
        setIsGenerating(true)
        try {
            const doc = new jsPDF("landscape")
            const pageWidth = doc.internal.pageSize.getWidth()
            let startY = 15

            // --- 1. CABEÇALHO DO PDF ---
            const textStartX = logoUrl ? 42 : 14 // Espaço ajustado dinamicamente caso exista logo

            if (logoUrl) {
                const img = await loadImage(logoUrl)
                if (img) {
                    // Logo reduzida de 30 para 22 para não ocupar tanto espaço vertical
                    const imgWidth = 22
                    const imgHeight = (img.height * imgWidth) / img.width
                    doc.addImage(img, 'PNG', 14, 10, imgWidth, imgHeight)
                }
            }

            doc.setFontSize(16)
            doc.setTextColor(15, 23, 42) // Slate 900
            doc.text("Espelho de Vendas e Tabela de Preços", textStartX, startY)
            
            startY += 6
            doc.setFontSize(10)
            doc.setTextColor(100, 116, 139) // Slate 500
            const subtitle = `${projetoNome}${tabelaCodigo ? ` • Tabela: ${tabelaCodigo}` : ''}`
            doc.text(subtitle, textStartX, startY)

            // Data de emissão alinhada à direita
            const dateStr = `Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`
            doc.setFontSize(8)
            doc.text(dateStr, pageWidth - 14, 15, { align: "right" })

            startY += 15 // Espaçamento antes da tabela

            // --- 2. PREPARAÇÃO DOS DADOS DA TABELA ---
            // Títulos alterados para MAIÚSCULO e coluna simplificada para "UNIDADE"
            const head = [[
                "UNIDADE",
                "STATUS",
                "ÁREA PRIV.",
                "ÁREA COM.",
                "VALOR",
                ...flows.map((f) => `${f.tipo.toUpperCase()} (${f.qtdeParcelas}X)`)
            ]]

            const body = units.map((unit) => {
                const valFinal = unit.valorTabela
                let sumReal = 0

                // Lógica idêntica à da tela para consistência de valores
                const correctedFlows = flows.map((f) => {
                    const totalCondicao = valFinal * (Number(f.percentual) / 100)
                    const valorParcela = Number((totalCondicao / f.qtdeParcelas).toFixed(2))
                    sumReal += (valorParcela * f.qtdeParcelas)
                    return { ...f, valorParcela }
                })

                const diff = Number((valFinal - sumReal).toFixed(2))
                if (Math.abs(diff) > 0 && correctedFlows.length > 0) {
                    let target = correctedFlows.find((f) => f.tipo.toUpperCase() === 'ENTRADA' && f.qtdeParcelas === 1)
                    if (!target) target = correctedFlows.find((f) => f.qtdeParcelas === 1) || correctedFlows[0]

                    if (target.qtdeParcelas === 1) {
                        target.valorParcela = Number((target.valorParcela + diff).toFixed(2))
                    }
                }

                return [
                    `${unit.blocoNome} - ${unit.unidade}`,
                    formatStatusLabel(unit.statusComercial),
                    fmtDecimal(unit.areaPrivativa),
                    fmtDecimal(unit.areaUsoComum),
                    valFinal > 0 ? fmtCurrency(valFinal) : "Sob Consulta",
                    ...correctedFlows.map((f) => (valFinal > 0 ? fmtCurrency(f.valorParcela) : "-"))
                ]
            })

            // --- 3. ESTILIZAÇÃO AVANÇADA DA TABELA ---
            autoTable(doc, {
                startY,
                head,
                body,
                theme: 'grid',
                styles: { 
                    font: 'helvetica',
                    fontSize: 8, // Fonte aumentada de 7 para 8
                    cellPadding: 3,
                    lineColor: [226, 232, 240], // Slate 200
                    lineWidth: 0.1,
                    textColor: [51, 65, 85] // Slate 700
                },
                headStyles: { 
                    fillColor: [248, 250, 252], // Slate 50 (Cinza bem claro)
                    textColor: [15, 23, 42], // Slate 900
                    fontStyle: 'bold',
                    halign: 'center'
                },
                alternateRowStyles: { 
                    fillColor: [250, 250, 250] // Linhas zebradas muito sutis
                },
                columnStyles: {
                    0: { fontStyle: 'bold', halign: 'center' }, // Unidade
                    1: { halign: 'center' }, // Status
                    2: { halign: 'right' }, // Area P.
                    3: { halign: 'right' }, // Area C.
                    4: { fontStyle: 'bold', halign: 'right', textColor: [15, 23, 42] }, // Valor
                },
                didParseCell: function(data) {
                    if (data.section === 'body') {
                        // Alinha todas as colunas de parcelas à direita
                        if (data.column.index > 4) {
                            data.cell.styles.halign = 'right'
                        }
                        // Pinta dinamicamente o texto do status
                        if (data.column.index === 1) {
                            const statusStr = String(data.cell.raw)
                            data.cell.styles.textColor = getPdfStatusColor(statusStr)
                            data.cell.styles.fontStyle = 'bold'
                        }
                    }
                }
            })

            // --- 4. NOME DINÂMICO DO ARQUIVO ---
            const fileName = tabelaCodigo 
                ? `Tabela de Precos - ${tabelaCodigo}.pdf` 
                : `Tabela de Precos - ${projetoNome}.pdf`

            doc.save(fileName)

        } catch (error) {
            console.error("Erro ao gerar PDF:", error)
        } finally {
            setIsGenerating(false)
        }
    }

    return (
        <Button 
            onClick={handleExport} 
            disabled={isGenerating}
            className="w-full sm:w-auto"
        >
            {isGenerating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
                <FileDown className="mr-2 h-4 w-4" />
            )}
            {isGenerating ? "Gerando..." : "Baixar PDF"}
        </Button>
    )
}