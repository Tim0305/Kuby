import { useState } from "react"
import type { FormEvent } from "react"
import { ApiError } from "../lib/api"
import { PasswordInput } from "./password-input"
import {
  Button, Card, CardContent, CardDescription, CardHeader, CardTitle,
  Field, FieldDescription, FieldError, FieldGroup, FieldLabel, Input,
} from "./ui"

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
      setFields({ matricula: "Enter your student ID." })
      return
    }
    setPending(true)
    try {
      await onLogin(matricula, String(values.get("password") ?? ""))
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not sign in. Please try again.")
      if (error instanceof ApiError) setFields(error.fields)
      setPending(false)
    }
  }

  return (
    <Card className="border border-transparent [--card-spacing:--spacing(6)]">
      <CardHeader className="gap-2 text-center">
        <CardTitle role="heading" aria-level={1} className="text-xl font-semibold">Welcome back</CardTitle>
        <CardDescription>Sign in to your Kuby account</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} aria-busy={pending}>
          <FieldGroup>
            <Field data-invalid={!!fields.matricula}>
              <FieldLabel htmlFor="matricula">Student ID</FieldLabel>
              <Input id="matricula" name="matricula" placeholder="A00000000" autoComplete="username" autoCapitalize="none" spellCheck={false} maxLength={20} required disabled={pending} aria-invalid={!!fields.matricula} aria-describedby={fields.matricula ? "matricula-error" : undefined} className="h-10 bg-background text-sm md:text-sm" />
              <FieldError id="matricula-error">{fields.matricula}</FieldError>
            </Field>
            <Field data-invalid={!!fields.password}>
              <FieldLabel htmlFor="password">Password</FieldLabel>
              <PasswordInput id="password" name="password" autoComplete="current-password" maxLength={72} required disabled={pending} aria-invalid={!!fields.password} aria-describedby={fields.password ? "password-error" : undefined} />
              <FieldError id="password-error">{fields.password}</FieldError>
            </Field>
            <Field>
              <FieldError>{error}</FieldError>
              <Button type="submit" disabled={pending} className="h-10 w-full text-sm">{pending ? "Signing in..." : "Sign in"}</Button>
              <FieldDescription className="text-center">Don&apos;t have an account? <a href="/signup">Sign up</a></FieldDescription>
            </Field>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  )
}
