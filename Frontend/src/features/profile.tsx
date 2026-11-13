import { useState } from "react"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input
} from "@/components/ui"
import { PasswordInput } from "@/components/password-input"
import { deletePhoto, updateProfile, uploadPhoto } from "@/lib/api"
import type { Usuario } from "@/lib/api"
import { validatePhoto } from "@/lib/booking"
import { ActionForm, ConfirmAction, FormField, Section, text } from "@/features/shared"

export function Profile({
  user,
  onUserChange
}: {
  user: Usuario
  onUserChange: (user: Usuario) => void
}) {
  const [photoVersion, setPhotoVersion] = useState(0)
  return (
    <Section
      id="profile"
      title="My profile"
      description={`${user.matricula} · ${user.rol === "admin" ? "Administrator" : "User account"}`}
    >
      <div className="grid items-start gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Personal details</CardTitle>
          </CardHeader>
          <CardContent>
            <ActionForm
              action={async (values) => {
                onUserChange(
                  await updateProfile(user.id_usuario, {
                    nombre: text(values, "nombre"),
                    apellido: text(values, "apellido")
                  })
                )
              }}
              success="Your profile has been updated."
            >
              <FormField label="First name">
                <Input
                  aria-label="Profile first name"
                  name="nombre"
                  required
                  maxLength={100}
                  defaultValue={user.nombre}
                />
              </FormField>
              <FormField label="Last name">
                <Input
                  aria-label="Profile last name"
                  name="apellido"
                  required
                  maxLength={100}
                  defaultValue={user.apellido}
                />
              </FormField>
            </ActionForm>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Change password</CardTitle>
          </CardHeader>
          <CardContent>
            <ActionForm
              submit="Update password"
              resetOnSuccess
              success="Your password has been updated."
              action={async (values) => {
                const password = String(values.get("password") ?? "")
                if (password !== values.get("confirm"))
                  throw new Error("Passwords do not match.")
                await updateProfile(user.id_usuario, {
                  password,
                  password_actual: String(values.get("current") ?? "")
                })
              }}
            >
              <FormField label="Current password">
                <PasswordInput
                  aria-label="Current password"
                  name="current"
                  autoComplete="current-password"
                  required
                  maxLength={72}
                />
              </FormField>
              <FormField label="New password" hint="Use 8 to 72 characters.">
                <PasswordInput
                  aria-label="New password"
                  name="password"
                  autoComplete="new-password"
                  minLength={8}
                  maxLength={72}
                  required
                />
              </FormField>
              <FormField label="Confirm new password">
                <PasswordInput
                  aria-label="Confirm new password"
                  name="confirm"
                  autoComplete="new-password"
                  minLength={8}
                  maxLength={72}
                  required
                />
              </FormField>
            </ActionForm>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Profile photo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Avatar className="size-16 outline -outline-offset-1 outline-black/10 dark:outline-white/10">
              {user.tiene_foto && (
                <AvatarImage
                  src={`/api/usuarios/${user.id_usuario}/foto?v=${photoVersion}`}
                  alt={`${user.nombre} ${user.apellido}`}
                />
              )}
              <AvatarFallback>
                {user.nombre[0]}
                {user.apellido[0]}
              </AvatarFallback>
            </Avatar>
            <ActionForm
              submit="Upload photo"
              resetOnSuccess
              success="Your photo has been updated."
              action={async (values) => {
                const file = values.get("foto")
                if (!(file instanceof File))
                  throw new Error("Choose a photo first.")
                validatePhoto(file)
                await uploadPhoto(user.id_usuario, file)
                setPhotoVersion((value) => value + 1)
                onUserChange({ ...user, tiene_foto: true })
              }}
            >
              <FormField label="Choose photo" hint="JPG or PNG, up to 2 MB.">
                <Input
                  aria-label="Choose photo"
                  type="file"
                  name="foto"
                  accept="image/jpeg,image/png"
                  required
                />
              </FormField>
            </ActionForm>
            {user.tiene_foto && (
              <ConfirmAction
                label="Remove photo"
                description="Remove your profile photo? Your initials will be displayed instead."
                action={async () => {
                  await deletePhoto(user.id_usuario)
                  onUserChange({ ...user, tiene_foto: false })
                }}
                onDone={() => setPhotoVersion((value) => value + 1)}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </Section>
  )
}
