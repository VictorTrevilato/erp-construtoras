"use client"

import { useState, useCallback, useEffect } from "react"
import Cropper, { Area } from "react-easy-crop"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Loader2, Focus } from "lucide-react"
import { useWhiteLabelTheme } from "@/components/theme-wrapper" // <- HOOK
import { cn } from "@/lib/utils" // <- Importado o classNames

const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image()
    image.addEventListener("load", () => resolve(image))
    image.addEventListener("error", (error) => reject(error))
    image.src = url
  })

async function getCroppedImg(
  imageSrc: string,
  pixelCrop: Area,
  fileName: string = "cropped-image.png"
): Promise<File | null> {
  const image = await createImage(imageSrc)
  const canvas = document.createElement("canvas")
  const ctx = canvas.getContext("2d")

  if (!ctx) return null

  canvas.width = pixelCrop.width
  canvas.height = pixelCrop.height

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  )

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        resolve(null)
        return
      }
      const file = new File([blob], fileName, { type: "image/png" })
      resolve(file)
    }, "image/png")
  })
}

interface ImageCropperModalProps {
  isOpen: boolean
  onClose: () => void
  imageUrl: string
  onCropComplete: (croppedFile: File) => void
  aspectRatio?: number
  title?: string
}

export function ImageCropperModal({
  isOpen,
  onClose,
  imageUrl,
  onCropComplete,
  aspectRatio = 1,
  title = "Recortar Imagem",
}: ImageCropperModalProps) {
  const { accentTheme } = useWhiteLabelTheme() // <- HOOK ADICIONADO
  const themeAccentSlider = accentTheme === 'secondary' ? 'accent-secondary' : 'accent-primary'

  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  
  const [isProcessing, setIsProcessing] = useState(false)
  const [isInteracting, setIsInteracting] = useState(false)
  const [isCentering, setIsCentering] = useState(false) 

  useEffect(() => {
    if (isOpen) {
      setZoom(1)
      setCrop({ x: 0, y: 0 })
      setCroppedAreaPixels(null)
      setIsInteracting(false)
      setIsCentering(false)
    }
  }, [isOpen])

  const onCropChange = (location: { x: number; y: number }) => setCrop(location)
  const onZoomChange = (newZoom: number) => setZoom(newZoom)
  
  const onCropCompleteHandler = useCallback((croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels)
    setIsCentering(false) 
  }, [])

  const handleConfirm = async () => {
    if (!croppedAreaPixels) return

    try {
      setIsProcessing(true)
      const croppedFile = await getCroppedImg(imageUrl, croppedAreaPixels, `crop-${Date.now()}.png`)
      if (croppedFile) onCropComplete(croppedFile)
    } catch (e) {
      console.error("Erro ao processar imagem:", e)
    } finally {
      setIsProcessing(false)
      onClose()
    }
  }

  const handleCenterImage = () => {
    setIsCentering(true) 
    setCrop({ x: 0, y: 0 }) 
    
    setTimeout(() => {
      setIsCentering(false)
    }, 150) 
  }

  const isButtonDisabled = isProcessing || isInteracting || isCentering

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl p-0 overflow-hidden bg-white">
        <DialogHeader className="p-6 pb-4 border-b shrink-0">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Arraste a imagem ou use a barra de zoom para enquadrar corretamente.
          </DialogDescription>
        </DialogHeader>

        <div className="p-6 space-y-6">
          <div 
            className="relative w-full h-64 sm:h-80 rounded-md overflow-hidden border bg-slate-100"
            style={{
              backgroundImage: 'repeating-linear-gradient(45deg, #e2e8f0 25%, transparent 25%, transparent 75%, #e2e8f0 75%, #e2e8f0), repeating-linear-gradient(45deg, #e2e8f0 25%, #ffffff 25%, #ffffff 75%, #e2e8f0 75%, #e2e8f0)',
              backgroundPosition: '0 0, 10px 10px',
              backgroundSize: '20px 20px'
            }}
          >
            <Cropper
              image={imageUrl}
              crop={crop}
              zoom={zoom}
              aspect={aspectRatio}
              minZoom={0.2}
              zoomSpeed={0.1}
              restrictPosition={false}
              onCropChange={onCropChange}
              onCropComplete={onCropCompleteHandler}
              onZoomChange={onZoomChange}
              onInteractionStart={() => setIsInteracting(true)}
              onInteractionEnd={() => setIsInteracting(false)}
            />
          </div>

          <div className="flex items-end gap-4">
            <div className="flex-1 space-y-2">
              <div className="flex justify-between text-xs text-slate-500 font-medium">
                <span>Zoom</span>
                <span>{Math.round(zoom * 100)}%</span>
              </div>
              <input
                type="range"
                value={zoom}
                min={0.2}
                max={3}
                step={0.01}
                aria-labelledby="Zoom"
                onChange={(e) => setZoom(Number(e.target.value))}
                className={cn("w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer", themeAccentSlider)}
              />
            </div>
            <Button 
              type="button" 
              variant="outline" 
              size="sm" 
              className="shrink-0 h-8 text-xs flex items-center gap-1.5"
              onClick={handleCenterImage}
              disabled={isCentering}
            >
              <Focus className="w-3.5 h-3.5" />
              Centralizar
            </Button>
          </div>
        </div>

        <DialogFooter className="p-4 bg-slate-50 border-t shrink-0">
          <Button variant="ghost" onClick={onClose} disabled={isProcessing}>Cancelar</Button>
          <Button onClick={handleConfirm} disabled={isButtonDisabled}>
            {isProcessing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processando...</> : "Confirmar Recorte"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}