"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner } from "sonner"
import styles from "@/styles/toast.module.css"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      position="top-center"
      offset="20px"
      toastOptions={{
        className: styles.toast,
        style: {
          position: 'fixed',
          top: '5rem',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1000,
          width: 'auto',
          maxWidth: '14rem',
          margin: 0,
          padding: 0,
        },
        classNames: {
          toast: `${styles.toast} group`,
          title: styles.toastTitle,
          description: `${styles.toastDescription} group-[.toast]:text-muted-foreground`,
          actionButton: `${styles.toastAction} group-[.toast]:bg-primary group-[.toast]:text-primary-foreground`,
          cancelButton: `${styles.toastCancel} group-[.toast]:bg-muted group-[.toast]:text-muted-foreground`,
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
