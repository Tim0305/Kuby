import { cloneElement, useId, useRef, useState } from "react"
import type { ReactElement, ReactNode } from "react"
import { ArrowClockwiseIcon } from "@phosphor-icons/react"
import { ApiError } from "../lib/api"
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Field,
  FieldError,
  FieldLabel,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton
} from "../components/ui"

export function Section({
  id,
  title,
  description,
  children,
  action
}: {
  id: string
  title: string
  description?: string
  children: ReactNode
  action?: ReactNode
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className="scroll-mt-6 space-y-4"
    >
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id={`${id}-title`} className="!mb-1 !text-xl font-semibold">
            {title}
          </h2>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {action}
      </header>
      {children}
    </section>
  )
}

export function RemoteState({
  loading,
  error,
  reload
}: {
  loading: boolean
  error?: Error
  reload: () => void
}) {
  if (error)
    return (
      <div
        role="alert"
        className="flex flex-wrap items-center justify-between gap-3 border border-destructive/30 bg-destructive/5 p-4 text-sm"
      >
        <p>{error.message}</p>
        <Button variant="outline" onClick={reload}>
          Try again
        </Button>
      </div>
    )
  if (loading)
    return (
      <div role="status" className="space-y-2">
        <span className="sr-only">Loading…</span>
        <Skeleton className="h-2 w-full" />
      </div>
    )
  return null
}

export function RefreshButton({
  reload,
  loading
}: {
  reload: () => void
  loading: boolean
}) {
  return (
    <Button variant="outline" onClick={reload} disabled={loading}>
      <ArrowClockwiseIcon data-icon="inline-start" />
      Refresh
    </Button>
  )
}

const statusNames: Record<string, string> = {
  creada: "Upcoming",
  activa: "In use",
  finalizada: "Completed",
  liberada: "Released (no check-in)",
  cancelada: "Cancelled",
  activo: "Active",
  inactivo: "Inactive",
  mantenimiento: "Maintenance",
  permitido: "Allowed",
  denegado: "Denied"
}
export function Status({ value }: { value: string }) {
  return (
    <Badge
      variant={
        value === "denegado" || value === "inactivo" || value === "cancelada"
          ? "outline"
          : "secondary"
      }
    >
      {statusNames[value] ?? value}
    </Badge>
  )
}

export function FormField({
  label,
  children,
  hint
}: {
  label: string
  children: ReactElement<{ id?: string }>
  hint?: string
}) {
  const id = useId()
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      {cloneElement(children, { id })}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </Field>
  )
}

export function Choice({
  label,
  value,
  onChange,
  options,
  name,
  id,
  required = false
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
  name?: string
  id?: string
  required?: boolean
}) {
  return (
    <Select
      value={value}
      onValueChange={(value) => {
        if (value !== null) onChange(value)
      }}
      name={name}
      required={required}
      items={options}
    >
      <SelectTrigger
        id={id}
        aria-label={label}
        className="h-10 w-full bg-background text-sm"
      >
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export function ActionForm({
  action,
  children,
  submit = "Save changes",
  success,
  onDone,
  destructive = false,
  resetOnSuccess = false
}: {
  action: (values: FormData) => Promise<void>
  children?: ReactNode
  submit?: string
  success?: string
  onDone?: () => void
  destructive?: boolean
  resetOnSuccess?: boolean
}) {
  const [pending, setPending] = useState(false)
  const pendingRef = useRef(false)
  const [error, setError] = useState<string>()
  const [fields, setFields] = useState<Record<string, string>>({})
  const [saved, setSaved] = useState(false)
  return (
    <form
      aria-busy={pending}
      onSubmit={async (event) => {
        event.preventDefault()
        if (pendingRef.current) return
        const form = event.currentTarget
        const values = new FormData(form)
        pendingRef.current = true
        setPending(true)
        setError(undefined)
        setFields({})
        setSaved(false)
        try {
          await action(values)
          if (resetOnSuccess) form.reset()
          setSaved(true)
          onDone?.()
        } catch (error) {
          setError(
            error instanceof Error
              ? error.message
              : "Could not save. Please try again."
          )
          if (error instanceof ApiError) setFields(error.fields)
        } finally {
          pendingRef.current = false
          setPending(false)
        }
      }}
    >
      <fieldset disabled={pending} className="min-w-0 space-y-4">
        {children}
        {error && <FieldError>{error}</FieldError>}
        {Object.entries(fields).map(([field, message]) => (
          <FieldError key={field}>
            {field}: {message}
          </FieldError>
        ))}
        {saved && success && (
          <p role="status" className="text-sm text-primary">
            {success}
          </p>
        )}
        <Button
          type="submit"
          variant={destructive ? "destructive" : "default"}
          disabled={pending}
        >
          {pending ? "Saving…" : submit}
        </Button>
      </fieldset>
    </form>
  )
}

export function Modal({
  title,
  description,
  onClose,
  children
}: {
  title: string
  description: string
  onClose: () => void
  children: ReactNode
}) {
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent className="max-h-[85svh] overflow-y-auto overscroll-contain p-6 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg">{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  )
}

export function ConfirmAction({
  label,
  description,
  action,
  onDone
}: {
  label: string
  description: string
  action: () => Promise<void>
  onDone: () => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        {label}
      </Button>
      {open && (
        <Modal
          title={label}
          description={description}
          onClose={() => setOpen(false)}
        >
          <ActionForm
            action={action}
            submit={label}
            destructive
            onDone={() => {
              setOpen(false)
              onDone()
            }}
          />
        </Modal>
      )}
    </>
  )
}

export function LocalTime({ value }: { value: string }) {
  return (
    <time dateTime={value} className="whitespace-nowrap">
      {new Date(value).toLocaleString([], {
        dateStyle: "medium",
        timeStyle: "short"
      })}
    </time>
  )
}

// This small form helper stays with the shared form components.
// eslint-disable-next-line react-refresh/only-export-components
export const text = (values: FormData, key: string) =>
  String(values.get(key) ?? "").trim()
