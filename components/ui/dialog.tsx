import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface DialogProps {
  open: boolean
  onClose: () => void
  children: React.ReactNode
}

const Dialog = ({ open, onClose, children }: DialogProps) => {
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose()
      }
    }

    if (open) {
      document.addEventListener("keydown", handleEscape)
      document.body.style.overflow = "hidden"
    }

    return () => {
      document.removeEventListener("keydown", handleEscape)
      document.body.style.overflow = "unset"
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="fixed inset-0 bg-black/50"
        onClick={onClose}
      />
      <div className="relative z-50 mx-4 max-h-[90vh] w-full max-w-lg overflow-auto rounded-lg border bg-white p-4 md:p-6 shadow-lg">
        {children}
      </div>
    </div>
  )
}

interface DialogHeaderProps {
  children: React.ReactNode
  className?: string
}

const DialogHeader = ({ children, className }: DialogHeaderProps) => (
  <div className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)}>
    {children}
  </div>
)

interface DialogTitleProps {
  children: React.ReactNode
  className?: string
}

const DialogTitle = ({ children, className }: DialogTitleProps) => (
  <h3 className={cn("text-lg font-semibold leading-none tracking-tight text-gray-900", className)}>
    {children}
  </h3>
)

interface DialogContentProps {
  children: React.ReactNode
  className?: string
}

const DialogContent = ({ children, className }: DialogContentProps) => (
  <div className={cn("py-4", className)}>
    {children}
  </div>
)

interface DialogFooterProps {
  children: React.ReactNode
  className?: string
}

const DialogFooter = ({ children, className }: DialogFooterProps) => (
  <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-0 sm:space-x-2", className)}>
    {children}
  </div>
)

interface ConfirmDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
}

const ConfirmDialog = ({ open, onClose, onConfirm, title, message }: ConfirmDialogProps) => (
  <Dialog open={open} onClose={onClose}>
    <DialogHeader>
      <DialogTitle>{title}</DialogTitle>
    </DialogHeader>
    <DialogContent>
      <p className="text-gray-700">{message}</p>
    </DialogContent>
    <DialogFooter>
      <Button variant="outline" onClick={onClose}>
        Cancel
      </Button>
      <Button variant="destructive" onClick={onConfirm}>
        Confirm
      </Button>
    </DialogFooter>
  </Dialog>
)

interface AlertDialogProps {
  open: boolean
  onClose: () => void
  title: string
  message: string
}

const AlertDialog = ({ open, onClose, title, message }: AlertDialogProps) => (
  <Dialog open={open} onClose={onClose}>
    <DialogHeader>
      <DialogTitle>{title}</DialogTitle>
    </DialogHeader>
    <DialogContent>
      <p className="text-gray-700">{message}</p>
    </DialogContent>
    <DialogFooter>
      <Button onClick={onClose}>
        OK
      </Button>
    </DialogFooter>
  </Dialog>
)

export { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter, ConfirmDialog, AlertDialog }