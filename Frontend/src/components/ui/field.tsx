import type { ComponentProps } from "react"
import { cn } from "cn"
import { Label } from "./label"

// Vertical field primitives from shadcn's Field component.
function FieldGroup({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="field-group" className={cn("group/field-group flex w-full flex-col gap-5", className)} {...props} />
}

function Field({ className, ...props }: ComponentProps<"div">) {
  return <div role="group" data-slot="field" data-orientation="vertical" className={cn("group/field flex w-full flex-col gap-2 data-[invalid=true]:text-destructive", className)} {...props} />
}

function FieldLabel({ className, ...props }: ComponentProps<typeof Label>) {
  return <Label data-slot="field-label" className={cn("flex w-fit gap-2 leading-snug group-data-[disabled=true]/field:opacity-50", className)} {...props} />
}

function FieldDescription({ className, ...props }: ComponentProps<"p">) {
  return <p data-slot="field-description" className={cn("text-xs/relaxed font-normal text-muted-foreground [&>a]:underline [&>a]:underline-offset-4 [&>a:hover]:text-primary", className)} {...props} />
}

function FieldError({ className, children, ...props }: ComponentProps<"div">) {
  if (!children) return null
  return <div role="alert" data-slot="field-error" className={cn("text-xs font-normal text-destructive", className)} {...props}>{children}</div>
}

export { Field, FieldGroup, FieldLabel, FieldDescription, FieldError }
