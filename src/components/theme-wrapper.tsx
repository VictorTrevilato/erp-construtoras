"use client"

import { useEffect, createContext, useContext } from "react"

// --- 1. CRIAÇÃO DO CONTEXTO WHITE-LABEL ---
interface WhiteLabelContextType {
  buttonsTheme: 'primary' | 'secondary'
  subButtonsTheme: 'primary' | 'secondary'
  tooltipsTheme: 'primary' | 'secondary'
  accentTheme: 'primary' | 'secondary'
  topbarTheme: 'primary' | 'secondary' // <- Topbar adicionada!
}

const WhiteLabelContext = createContext<WhiteLabelContextType>({
  buttonsTheme: 'primary',
  subButtonsTheme: 'secondary',
  tooltipsTheme: 'primary',
  accentTheme: 'primary',
  topbarTheme: 'primary',
})

export const useWhiteLabelTheme = () => useContext(WhiteLabelContext)

// --- FUNÇÕES MATEMÁTICAS ---
function hexToHslString(hex: string): string {
  hex = hex.replace(/^#/, '')
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('')
  const r = parseInt(hex.substring(0, 2), 16) / 255
  const g = parseInt(hex.substring(2, 4), 16) / 255
  const b = parseInt(hex.substring(4, 6), 16) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h = 0, s = 0
  const l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break
      case g: h = (b - r) / d + 2; break
      case b: h = (r - g) / d + 4; break
    }
    h /= 6
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`
}

function getContrastForeground(hex: string): string {
  hex = hex.replace(/^#/, '')
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('')
  const r = parseInt(hex.substring(0, 2), 16)
  const g = parseInt(hex.substring(2, 4), 16)
  const b = parseInt(hex.substring(4, 6), 16)
  const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000
  return yiq >= 128 ? "222.2 84% 4.9%" : "210 40% 98%" 
}

// --- 2. PROPS DO WRAPPER ---
interface ThemeWrapperProps {
  theme?: string
  primaryColor?: string | null
  secondaryColor?: string | null
  buttonsTheme?: string | null
  subButtonsTheme?: string | null
  tooltipsTheme?: string | null
  accentTheme?: string | null
  topbarTheme?: string | null // <- Prop da Topbar
  children: React.ReactNode
}

export function ThemeWrapper({ 
  theme = "theme-app", 
  primaryColor,
  secondaryColor,
  buttonsTheme,
  subButtonsTheme,
  tooltipsTheme,
  accentTheme,
  topbarTheme,
  children 
}: ThemeWrapperProps) {
  
  useEffect(() => {
    if (theme) document.body.classList.add(theme)
    return () => {
      if (theme) document.body.classList.remove(theme)
    }
  }, [theme])

  const customStyles: Record<string, string> = {}

  if (primaryColor) {
    customStyles['--primary'] = hexToHslString(primaryColor)
    customStyles['--primary-foreground'] = getContrastForeground(primaryColor)
    customStyles['--ring'] = hexToHslString(primaryColor)
  }

  if (secondaryColor) {
    customStyles['--secondary'] = hexToHslString(secondaryColor)
    customStyles['--secondary-foreground'] = getContrastForeground(secondaryColor)
  }

  const contextValue: WhiteLabelContextType = {
    buttonsTheme: (buttonsTheme as 'primary' | 'secondary') || 'primary',
    subButtonsTheme: (subButtonsTheme as 'primary' | 'secondary') || 'secondary',
    tooltipsTheme: (tooltipsTheme as 'primary' | 'secondary') || 'primary',
    accentTheme: (accentTheme as 'primary' | 'secondary') || 'primary',
    topbarTheme: (topbarTheme as 'primary' | 'secondary') || 'primary',
  }

  return (
    <WhiteLabelContext.Provider value={contextValue}>
      <style dangerouslySetInnerHTML={{__html: `
        body {
          ${primaryColor ? `--primary: ${hexToHslString(primaryColor)} !important;` : ''}
          ${primaryColor ? `--primary-foreground: ${getContrastForeground(primaryColor)} !important;` : ''}
          ${primaryColor ? `--ring: ${hexToHslString(primaryColor)} !important;` : ''}
          
          ${secondaryColor ? `--secondary: ${hexToHslString(secondaryColor)} !important;` : ''}
          ${secondaryColor ? `--secondary-foreground: ${getContrastForeground(secondaryColor)} !important;` : ''}
        }
      `}} />
      
      <div style={customStyles as React.CSSProperties} className="contents">
        {children}
      </div>
    </WhiteLabelContext.Provider>
  )
}