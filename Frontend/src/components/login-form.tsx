import { useState } from "react"
import type { FormEvent } from "react"
import { ApiError } from "@/lib/api"
import { PasswordInput } from "@/components/password-input"
import {
  Button, Card, CardContent, CardDescription, CardHeader, CardTitle,
  Field, FieldDescription, FieldError, FieldGroup, FieldLabel, Input,
} from "@/components/ui"

export type AuthFormProps = { onLogin: (matricula: string, password: string) => Promise<void> }

// Adapted from shadcn login-03 for the existing student ID authentication API.
export function LoginForm({ onLogin }: AuthFormProps) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fields, setFields] = useState<Record<string, string>>({})

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return
    const values = new FormData(event.currentTarget)
    const matricula = String(values.get("matricula") ?? "").trim()
    setError(null)
    setFields({})
    if (!matricula) {
      setFields({ matricula: "Ingresa tu matrícula." })
      return
    }
    setPending(true)
    try {
      await onLogin(matricula, String(values.get("password") ?? ""))
    } catch (error) {
      setError(error instanceof Error ? error.message : "No se pudo iniciar sesión. Inténtalo de nuevo.")
      if (error instanceof ApiError) setFields(error.fields)
      setPending(false)
    }
  }

  return (
    <Card className="border border-transparent [--card-spacing:--spacing(6)]">
      <CardHeader className="gap-2 text-center">
        <CardTitle role="heading" aria-level={1} className="text-xl font-semibold">Te damos la bienvenida</CardTitle>
        <CardDescription>Inicia sesión en tu cuenta de Kuby</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} aria-busy={pending}>
          <FieldGroup>
            <Field data-invalid={!!fields.matricula}>
              <FieldLabel htmlFor="matricula">Matrícula</FieldLabel>
              <Input id="matricula" name="matricula" placeholder="A00000000" autoComplete="username" autoCapitalize="none" spellCheck={false} maxLength={20} required disabled={pending} aria-invalid={!!fields.matricula} aria-describedby={fields.matricula ? "matricula-error" : undefined} className="h-10 bg-background text-sm md:text-sm" />
              <FieldError id="matricula-error">{fields.matricula}</FieldError>
            </Field>
            <Field data-invalid={!!fields.password}>
              <FieldLabel htmlFor="password">Contraseña</FieldLabel>
              <PasswordInput id="password" name="password" autoComplete="current-password" maxLength={72} required disabled={pending} aria-invalid={!!fields.password} aria-describedby={fields.password ? "password-error" : undefined} />
              <FieldError id="password-error">{fields.password}</FieldError>
            </Field>
            <Field>
              <FieldError>{error}</FieldError>
              <Button type="submit" disabled={pending} className="h-10 w-full text-sm">{pending ? "Iniciando sesión..." : "Iniciar sesión"}</Button>
              <FieldDescription className="text-center">¿No tienes una cuenta? <a href="/signup">Crear cuenta</a></FieldDescription>
            </Field>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  )
}
