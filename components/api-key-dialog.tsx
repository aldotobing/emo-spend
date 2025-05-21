"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"

interface ApiKeyDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (apiKey: string) => void
}

export function ApiKeyDialog({ open, onOpenChange, onSave }: ApiKeyDialogProps) {
  const [apiKey, setApiKey] = useState("")
  const { toast } = useToast()

  const handleSave = () => {
    if (!apiKey.trim()) {
      toast({
        title: "API Key diperlukan",
        description: "Silakan masukkan API Key DeepSeek AI Anda",
        variant: "destructive",
      })
      return
    }

    onSave(apiKey)
    onOpenChange(false)

    toast({
      title: "API Key disimpan",
      description: "API Key DeepSeek AI Anda telah disimpan",
      variant: "success",
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Masukkan API Key DeepSeek AI</DialogTitle>
          <DialogDescription>
            API Key diperlukan untuk menghasilkan wawasan AI yang dipersonalisasi tentang pola pengeluaran emosional
            Anda.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="api-key">API Key</Label>
            <Input
              id="api-key"
              type="password"
              placeholder="sk-..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            API Key Anda disimpan secara lokal di browser Anda dan tidak pernah dikirim ke server kami.
          </p>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button type="button" onClick={handleSave}>
            Simpan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
