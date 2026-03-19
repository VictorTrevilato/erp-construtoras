'use client'

import { useState } from "react"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { FileDown, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { NegotiationUnit } from "@/app/actions/commercial-negotiation"

// Helpers
const getUnitSuffix = (unitName: string, maxUnitValue: number) => {
    const nums = unitName.replace(/\D/g, '')
    if (!nums) return 999
    const digitsToTake = maxUnitValue < 100 ? 1 : 2
    return parseInt(nums.slice(-digitsToTake))
}

const formatStatusLabel = (status: string) => {
    const map: Record<string, string> = {
        'DISPONIVEL': 'Disponível',
        'RESERVADO': 'Reservado',
        'VENDIDO': 'Vendido',
        'EM_ANALISE': 'Em Análise'
    }
    return map[status] || status
}

const loadImage = (url: string): Promise<HTMLImageElement | null> => {
    return new Promise((resolve) => {
        const cleanUrl = String(url).trim()
        if (!cleanUrl || cleanUrl === 'null' || cleanUrl === 'undefined') {
            return resolve(null)
        }

        const img = new Image()
        img.crossOrigin = 'Anonymous'
        img.onload = () => resolve(img)
        img.onerror = (e) => {
            console.warn("Erro ao carregar logo para o PDF:", cleanUrl, e)
            resolve(null)
        }
        img.src = cleanUrl
    })
}

type ExportPdfSalesMirrorProps = {
    units: NegotiationUnit[]
    projetoNome?: string
    tabelaCodigo?: string | null
    logoUrl?: string | null
}

type PdfColumnStyle = {
    cellWidth?: number | 'auto' | 'wrap'
    fontStyle?: 'normal' | 'bold' | 'italic' | 'bolditalic'
    halign?: 'left' | 'center' | 'right' | 'justify'
    textColor?: number | [number, number, number]
}

export function ExportPdfSalesMirrorButton({
    units,
    projetoNome = "Projeto",
    tabelaCodigo,
    logoUrl
}: ExportPdfSalesMirrorProps) {
    const [isGenerating, setIsGenerating] = useState(false)

    const handleExport = async () => {
        setIsGenerating(true)
        const safeProjetoNome = projetoNome || "Projeto"

        try {
            const doc = new jsPDF("landscape")
            const pageWidth = doc.internal.pageSize.getWidth()

            let finalY = 15
            let logoBottomY = 15

            // --- 1. CABEÇALHO DO PDF ---
            const textStartX = logoUrl ? 42 : 14

            if (logoUrl) {
                const img = await loadImage(logoUrl)
                if (img) {
                    const imgWidth = 22
                    const imgHeight = (img.height * imgWidth) / img.width
                    doc.addImage(img, 'PNG', 14, 10, imgWidth, imgHeight)
                    logoBottomY = 10 + imgHeight
                }
            }

            doc.setFontSize(16)
            doc.setTextColor(15, 23, 42)
            doc.text("Espelho de Vendas", textStartX, finalY)

            finalY += 6
            doc.setFontSize(10)
            doc.setTextColor(100, 116, 139)
            const subtitle = `${safeProjetoNome}${tabelaCodigo ? ` • Tabela: ${tabelaCodigo}` : ''}`
            doc.text(subtitle, textStartX, finalY)

            const dateStr = `Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`
            doc.setFontSize(8)
            doc.text(dateStr, pageWidth - 14, 15, { align: "right" })

            finalY = Math.max(finalY + 12, logoBottomY + 8)

            // Resumo (KPIs)
            const disponiveis = units.filter(u => u.statusComercial === 'DISPONIVEL').length
            const reservadas = units.filter(u => u.statusComercial === 'RESERVADO').length
            const emAnalise = units.filter(u => u.statusComercial === 'EM_ANALISE').length
            const vendidas = units.filter(u => u.statusComercial === 'VENDIDO').length

            doc.setFontSize(9)
            doc.setTextColor(15, 23, 42)
            doc.text(
                `Total: ${units.length}   |   Disponíveis: ${disponiveis}   |   Reservadas: ${reservadas}   |   Em Análise: ${emAnalise}   |   Vendidas: ${vendidas}`,
                14,
                finalY
            )

            finalY += 10

            // --- 2. PREPARAÇÃO DOS DADOS POR BLOCO (Grid Visual) ---
            const floorUnits = units.filter(u => u.andar !== null)
            const specialUnits = units.filter(u => u.andar === null)

            const blocksMap = floorUnits.reduce((acc, unit) => {
                if (!acc[unit.blocoNome]) acc[unit.blocoNome] = []
                acc[unit.blocoNome].push(unit)
                return acc
            }, {} as Record<string, NegotiationUnit[]>)

            const sortedBlockNames = Object.keys(blocksMap).sort((a, b) =>
                a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
            )

            sortedBlockNames.forEach((blockName) => {
                const blockUnits = blocksMap[blockName]
                const maxUnitNumber = Math.max(
                    ...blockUnits.map(u => parseInt(u.unidade.replace(/\D/g, '') || '0'))
                )
                const floors = Array.from(new Set(blockUnits.map(u => u.andar))).sort(
                    (a, b) => (b as number) - (a as number)
                )
                const allSuffixes = Array.from(
                    new Set(blockUnits.map(u => getUnitSuffix(u.unidade, maxUnitNumber)))
                ).sort((a, b) => a - b)

                // Título do Bloco
                doc.setFontSize(12)
                doc.setTextColor(15, 23, 42)
                doc.text(`Bloco: ${blockName}`, 14, finalY + 5)

                const head = [["Andar", ...allSuffixes.map(s => `Final ${s}`)]]

                const body = floors.map(floor => {
                    const row: string[] = [floor === 0 ? "Térreo" : `${floor}º`]

                    allSuffixes.forEach(suffix => {
                        const unit = blockUnits.find(
                            u => u.andar === floor && getUnitSuffix(u.unidade, maxUnitNumber) === suffix
                        )

                        if (unit) {
                            row.push(
                                `${unit.unidade}\n${unit.areaPrivativa} m²\n${formatStatusLabel(unit.statusComercial)}`
                            )
                        } else {
                            row.push("")
                        }
                    })

                    return row
                })

                // Largura das colunas
                const margins = 28
                const firstColWidth = 18
                const availableWidth = pageWidth - margins - firstColWidth
                const colWidth = availableWidth / allSuffixes.length

                const dynamicColumnStyles: Record<number, PdfColumnStyle> = {
                    0: {
                        cellWidth: firstColWidth,
                        fontStyle: 'bold',
                        halign: 'right',
                        textColor: [100, 116, 139]
                    }
                }

                allSuffixes.forEach((_, idx) => {
                    dynamicColumnStyles[idx + 1] = { cellWidth: colWidth }
                })

                autoTable(doc, {
                    startY: finalY + 8,
                    head,
                    body,
                    theme: 'plain',
                    styles: {
                        font: 'helvetica',
                        fontSize: 8,
                        cellPadding: 4,
                        halign: 'center',
                        valign: 'middle',
                        lineWidth: 1,
                        lineColor: [255, 255, 255]
                    },
                    headStyles: {
                        fillColor: [248, 250, 252],
                        textColor: [100, 116, 139],
                        fontStyle: 'bold'
                    },
                    columnStyles: dynamicColumnStyles,
                    didParseCell: function (data) {
                        if (data.section === 'body' && data.column.index > 0) {
                            const text = String(data.cell.raw)

                            if (text.includes('Disponível')) {
                                data.cell.styles.fillColor = [34, 197, 94]
                                data.cell.styles.textColor = [255, 255, 255]
                                data.cell.styles.fontStyle = 'bold'
                            } else if (text.includes('Reservado')) {
                                data.cell.styles.fillColor = [245, 158, 11]
                                data.cell.styles.textColor = [15, 23, 42]
                            } else if (text.includes('Em Análise')) {
                                data.cell.styles.fillColor = [59, 130, 246]
                                data.cell.styles.textColor = [255, 255, 255]
                            } else if (text.includes('Vendido')) {
                                data.cell.styles.fillColor = [239, 68, 68]
                                data.cell.styles.textColor = [255, 255, 255]
                            } else if (data.cell.raw === "") {
                                data.cell.styles.fillColor = [241, 245, 249]
                            }
                        }
                    }
                })

                finalY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10
            })

            // --- 3. UNIDADES ESPECIAIS (LOJAS) ---
            if (specialUnits.length > 0) {
                doc.setFontSize(12)
                doc.setTextColor(15, 23, 42)
                doc.text(`Lojas & Áreas Comerciais`, 14, finalY + 5)

                const head = [["Unidade", "Área", "Status"]]
                const body = specialUnits.map(u => [
                    u.unidade,
                    `${u.areaPrivativa} m²`,
                    formatStatusLabel(u.statusComercial)
                ])

                autoTable(doc, {
                    startY: finalY + 8,
                    head,
                    body,
                    theme: 'grid',
                    styles: { fontSize: 9, cellPadding: 3, halign: 'center' },
                    headStyles: { fillColor: [248, 250, 252], textColor: [15, 23, 42] },
                    didParseCell: function (data) {
                        if (data.section === 'body' && data.column.index === 2) {
                            const status = data.cell.text[0]

                            if (status === 'Disponível') {
                                data.cell.styles.fillColor = [34, 197, 94]
                                data.cell.styles.textColor = [255, 255, 255]
                            } else if (status === 'Em Análise') {
                                data.cell.styles.fillColor = [59, 130, 246]
                                data.cell.styles.textColor = [255, 255, 255]
                            } else if (status === 'Vendido') {
                                data.cell.styles.fillColor = [239, 68, 68]
                                data.cell.styles.textColor = [255, 255, 255]
                            } else if (status === 'Reservado') {
                                data.cell.styles.fillColor = [245, 158, 11]
                                data.cell.styles.textColor = [15, 23, 42]
                            }
                        }
                    }
                })
            }

            doc.save(`Espelho de Vendas - ${safeProjetoNome}.pdf`)
        } catch (error) {
            console.error("Erro ao gerar PDF:", error)
        } finally {
            setIsGenerating(false)
        }
    }

    return (
        <Button onClick={handleExport} disabled={isGenerating} className="w-full sm:w-auto">
            {isGenerating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
                <FileDown className="mr-2 h-4 w-4" />
            )}
            {isGenerating ? "Gerando..." : "Baixar PDF"}
        </Button>
    )
}