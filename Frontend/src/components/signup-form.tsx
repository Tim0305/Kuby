import { useState } from "react"
import type { FormEvent } from "react"
import { ApiError, signup } from "@/lib/api"
import type { AuthFormProps } from "@/components/login-form"
import { PasswordInput } from "@/components/password-input"
import {
  Button, Card, CardContent, CardDescription, CardHeader, CardTitle,
  Field, FieldDescription, FieldError, FieldGroup, FieldLabel, Input,
} from "@/components/ui"

// Adapted from shadcn signup-03; account roles are assigned by the backend.
export function SignupForm({ onLogin }: AuthFormProps) {
  const [pending, setPending] = useState(false)
  const [created, setCreated] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fields, setFields] = useState<Record<string, string>>({})

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return
    const form = event.currentTarget
    const data = new FormData(form)
    const values = {
      nombre: String(data.get("nombre") ?? "").trim(),
      apellido: String(data.get("apellido") ?? "").trim(),
      matricula: String(data.get("matricula") ?? "").trim(),
      password: String(data.get("password") ?? ""),
    }
    const invalid: Record<string, string> = {}
    if (!values.nombre) invalid.nombre = "Ingresa tu nombre."
    if (!values.apellido) invalid.apellido = "Ingresa tu apellido."
    if (!values.matricula) invalid.matricula = "Ingresa tu matrícula."
    if (!created && values.password !== data.get("confirm-password")) invalid.confirm = "Las contraseñas no coinciden."
    setError(null)
    setFields(invalid)
    if (Object.keys(invalid).length > 0) return

    setPending(true)
    try {
      // A retry after successful creation must only sign in, never create twice.
      if (!created) {
        await signup(values)
        setCreated(true)
      }
      await onLogin(values.matricula, values.password)
    } catch (error) {
      setError(error instanceof Error ? error.message : "No se pudo completar el registro. Inténtalo de nuevo.")
      if (error instanceof ApiError) setFields(error.fields)
      setPending(false)
    }
  }

  return (
    <Card className="border border-transparent [--card-spacing:--spacing(6)]">
      <CardHeader className="gap-2 text-center">
        <CardTitle role="heading" aria-level={1} className="text-xl font-semibold">Crea tu cuenta</CardTitle>
        <CardDescription>Comienza con tu cuenta de Kuby</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} aria-busy={pending}>
          <FieldGroup>
            <div className="grid gap-5 sm:grid-cols-2 sm:gap-4">
              <Field data-invalid={!!fields.nombre}>
                <FieldLabel htmlFor="nombre">Nombre</FieldLabel>
                <Input id="nombre" name="nombre" autoComplete="given-name" maxLength={100} required disabled={pending} readOnly={created} aria-invalid={!!fields.nombre} aria-describedby={fields.nombre ? "nombre-error" : undefined} className="h-10 bg-background text-sm md:text-sm" />
                <FieldError id="nombre-error">{fields.nombre}</FieldError>
              </Field>
              <Field data-invalid={!!fields.apellido}>
                <FieldLabel htmlFor="apellido">Apellido</FieldLabel>
                <Input id="apellido" name="apellido" autoComplete="family-name" maxLength={100} required disabled={pending} readOnly={created} aria-invalid={!!fields.apellido} aria-describedby={fields.apellido ? "apellido-error" : undefined} className="h-10 bg-background text-sm md:text-sm" />
                <FieldError id="apellido-error">{fields.apellido}</FieldError>
              </Field>
            </div>
            <Field data-invalid={!!fields.matricula}>
              <FieldLabel htmlFor="matricula">Matrícula</FieldLabel>
              <Input id="matricula" name="matricula" placeholder="A00000000" autoComplete="username" autoCapitalize="none" spellCheck={false} maxLength={20} required disabled={pending} readOnly={created} aria-invalid={!!fields.matricula} aria-describedby={fields.matricula ? "matricula-error" : undefined} className="h-10 bg-background text-sm md:text-sm" />
              <FieldError id="matricula-error">{fields.matricula}</FieldError>
            </Field>
            <Field data-invalid={!!fields.password}>
              <FieldLabel htmlFor="password">Contraseña</FieldLabel>
              <PasswordInput id="password" name="password" autoComplete={created ? "current-password" : "new-password"} minLength={created ? 1 : 8} maxLength={72} required disabled={pending} aria-invalid={!!fields.password} aria-describedby={fields.password ? "password-error password-hint" : "password-hint"} />
              <FieldDescription id="password-hint">Usa de 8 a 72 caracteres.</FieldDescription>
              <FieldError id="password-error">{fields.password}</FieldError>
            </Field>
            {!created && <Field data-invalid={!!fields.confirm}>
              <FieldLabel htmlFor="confirm-password">Confirmar contraseña</FieldLabel>
              <PasswordInput id="confirm-password" name="confirm-password" autoComplete="new-password" minLength={8} maxLength={72} required disabled={pending} aria-invalid={!!fields.confirm} aria-describedby={fields.confirm ? "confirm-error" : undefined} />
              <FieldError id="confirm-error">{fields.confirm}</FieldError>
            </Field>}
            <Field>
              {created && <p role="status" className="text-xs text-muted-foreground">Tu cuenta se creó correctamente. Inicia sesión para continuar.</p>}
              <FieldError>{error}</FieldError>
              <Button type="submit" disabled={pending} className="h-10 w-full text-sm">{pending ? (created ? "Iniciando sesión..." : "Creando cuenta...") : (created ? "Iniciar sesión" : "Crear cuenta")}</Button>
              <FieldDescription className="text-center">¿Ya tienes una cuenta? <a href="/login">Iniciar sesión</a></FieldDescription>
            </Field>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  )
}
