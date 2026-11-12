import { EyeIcon, EyeSlashIcon } from "@phosphor-icons/react"
import { useState } from "react"
import type { ComponentProps } from "react"
import { Button, Input } from "./ui"

export function PasswordInput(props: Omit<ComponentProps<typeof Input>, "type" | "className">) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="relative">
      <Input {...props} type={visible ? "text" : "password"} className="h-10 bg-background pr-11 text-sm md:text-sm" />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="absolute inset-y-0 right-0 h-full w-10 text-muted-foreground"
        aria-label={`${visible ? "Hide" : "Show"} ${props.id === "confirm-password" ? "password confirmation" : "password"}`}
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
