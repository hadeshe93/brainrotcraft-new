"use client"

import { Toaster as Sonner, ToasterProps } from "sonner"
import { useAppContext } from "@/contexts/app"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme } = useAppContext()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="top-center"
      richColors={true}
      closeButton={true}
      duration={4000}
      {...props}
    />
  )
}

export { Toaster }
