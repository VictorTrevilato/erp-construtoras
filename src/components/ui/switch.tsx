"use client"

import * as React from "react"
import * as SwitchPrimitives from "@radix-ui/react-switch"

import { cn } from "@/lib/utils"
import { useWhiteLabelTheme } from "@/components/theme-wrapper"

// Estendemos a tipagem para aceitar a nossa nova prop "forcePreview"
const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root> & { forcePreview?: boolean }
>(({ className, forcePreview, ...props }, ref) => {
  const { accentTheme } = useWhiteLabelTheme()
  
  // Lógica Padrão: Usa a cor do accentTheme (Secundária ou Primária) quando ativo
  let themeClass = accentTheme === 'secondary'
    ? "data-[state=checked]:bg-secondary"
    : "data-[state=checked]:bg-primary"

  // SOBREPOSIÇÃO (Override): Usado APENAS na tela de configurações da empresa
  if (forcePreview) {
    themeClass = "data-[state=checked]:bg-primary data-[state=unchecked]:bg-secondary"
  }

  return (
    <SwitchPrimitives.Root
      className={cn(
        "peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
        // Só aplicamos o cinza padrão (bg-input) se NÃO for preview
        !forcePreview && "data-[state=unchecked]:bg-input", 
        themeClass,
        className
      )}
      {...props}
      ref={ref}
    >
      <SwitchPrimitives.Thumb
        className={cn(
          "pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0"
        )}
      />
    </SwitchPrimitives.Root>
  )
})
Switch.displayName = SwitchPrimitives.Root.displayName

export { Switch }