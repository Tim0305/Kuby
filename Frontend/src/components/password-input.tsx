import { EyeIcon, EyeSlashIcon } from "@phosphor-icons/react"
import { useState } from "react"
import type { ComponentProps } from "react"
import { Button, Input } from "@/components/ui"

export function PasswordInput(props: Omit<ComponentProps<typeof Input>, "type" | "className">) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="relative">
      <Input {...props} type={visible ? "text" : "password"} className="pr-11" />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="absolute inset-y-0 right-0 h-full w-11 p-0 text-muted-foreground"
        aria-label={`${visible ? "Ocultar" : "Mostrar"} ${props.id === "confirm-password" ? "confirmación de contraseña" : "contraseña"}`}
        aria-controls={props.id}
        aria-pressed={visible}
        disabled={props.disabled}
        onClick={() => setVisible((value) => !value)}
      >
        {visible ? <EyeSlashIcon /> : <EyeIcon />}
      </Button>
    </div>
  )
}
