import { useState } from "react"
import type { ComponentProps } from "react"
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

// Keep the native file picker while giving its visible controls Spanish text.
function PhotoInput({ fileName, ...props }: ComponentProps<typeof Input> & { fileName: string }) {
  return (
    <div className="min-h-11 rounded-(--control-radius) text-[13px] relative flex h-10 min-w-0 items-center gap-2 border border-input bg-background px-2.5 text-[13px] focus-within:outline-2 focus-within:outline-ring">
      <Input {...props} type="file" className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
      <span aria-hidden="true" className="shrink-0 bg-muted px-2 py-1 font-medium">Seleccionar archivo</span>
      <span aria-hidden="true" className="min-w-0 truncate text-muted-foreground">{fileName || "Ningún archivo seleccionado"}</span>
    </div>
  )
}

export function Profile({
  user,
  onUserChange
}: {
  user: Usuario
  onUserChange: (user: Usuario) => void
}) {
  const [photoVersion, setPhotoVersion] = useState(0)
  const [photoName, setPhotoName] = useState("")
  return (
    <Section
      id="profile"
      title="Mi perfil"
      description={`${user.matricula} · ${user.rol === "admin" ? "Administrador" : "Cuenta de usuario"}`}
    >
      <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardHeader className="border-b border-border pb-5">
            <CardTitle>Datos personales</CardTitle>
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
              success="Tu perfil se actualizó correctamente."
            >
              <FormField label="Nombre">
                <Input
                  aria-label="Nombre del perfil"
                  name="nombre"
                  required
                  maxLength={100}
                  defaultValue={user.nombre}
                />
              </FormField>
              <FormField label="Apellido">
                <Input
                  aria-label="Apellido del perfil"
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
          <CardHeader className="border-b border-border pb-5">
            <CardTitle>Cambiar contraseña</CardTitle>
          </CardHeader>
          <CardContent>
            <ActionForm
              submit="Actualizar contraseña"
              resetOnSuccess
              success="Tu contraseña se actualizó correctamente."
              action={async (values) => {
                const password = String(values.get("password") ?? "")
                if (password !== values.get("confirm"))
                  throw new Error("Las contraseñas no coinciden.")
                await updateProfile(user.id_usuario, {
                  password,
                  password_actual: String(values.get("current") ?? "")
                })
              }}
            >
              <FormField label="Contraseña actual">
                <PasswordInput
                  aria-label="Contraseña actual"
                  name="current"
                  autoComplete="current-password"
                  required
                  maxLength={72}
                />
              </FormField>
              <FormField label="Nueva contraseña" hint="Usa de 8 a 72 caracteres.">
                <PasswordInput
                  aria-label="Nueva contraseña"
                  name="password"
                  autoComplete="new-password"
                  minLength={8}
                  maxLength={72}
                  required
                />
              </FormField>
              <FormField label="Confirmar nueva contraseña">
                <PasswordInput
                  aria-label="Confirmar nueva contraseña"
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
        <Card className="md:col-span-2 xl:col-span-1">
          <CardHeader className="border-b border-border pb-5">
            <CardTitle>Foto de perfil</CardTitle>
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
              submit="Subir foto"
              resetOnSuccess
              success="Tu foto se actualizó correctamente."
              action={async (values) => {
                const file = values.get("foto")
                if (!(file instanceof File))
                  throw new Error("Primero elige una foto.")
                validatePhoto(file)
                await uploadPhoto(user.id_usuario, file)
                setPhotoName("")
                setPhotoVersion((value) => value + 1)
                onUserChange({ ...user, tiene_foto: true })
              }}
            >
              <FormField label="Elegir foto" hint="JPG o PNG, hasta 2 MB.">
                <PhotoInput
                  aria-label="Elegir foto"
                  fileName={photoName}
                  onChange={(event) => setPhotoName(event.currentTarget.files?.[0]?.name ?? "")}
                  name="foto"
                  accept="image/jpeg,image/png"
                  required
                />
              </FormField>
            </ActionForm>
            {user.tiene_foto && (
              <ConfirmAction
                label="Eliminar foto"
                description="¿Quieres eliminar tu foto de perfil? Se mostrarán tus iniciales."
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
