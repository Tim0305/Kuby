import { useCallback, useState } from "react"
import {
  Button,
  Card,
  Input,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui"
import { deactivateUser, getUsers, updateUser } from "@/lib/api"
import type { Usuario } from "@/lib/api"
import { useRemote } from "@/hooks/use-remote"
import {
  ActionForm,
  Choice,
  ConfirmAction,
  FormField,
  Modal,
  RemoteState,
  Section,
  Status,
  text
} from "@/features/shared"

function UserEditor({
  user,
  roles,
  canManageRoles,
  onClose,
  onChange
}: {
  user: Usuario
  roles: { value: string; label: string }[]
  canManageRoles: boolean
  onClose: () => void
  onChange: () => void
}) {
  const [role, setRole] = useState(String(user.id_rol ?? ""))
  const [status, setStatus] = useState(user.estatus)
  return (
    <Modal
      title="Editar usuario"
      description={`${user.matricula} · La contraseña solo puede cambiarla su titular.`}
      onClose={onClose}
    >
      <ActionForm
        action={async (values) => {
          await updateUser(user.id_usuario, {
            nombre: text(values, "nombre"),
            apellido: text(values, "apellido"),
            ...(canManageRoles && role ? { id_rol: Number(role) } : {}),
            estatus: status as "activo" | "inactivo"
          })
        }}
        onDone={() => {
          onChange()
          onClose()
        }}
      >
        <FormField label="Nombre">
          <Input
            aria-label="Nombre"
            name="nombre"
            required
            maxLength={100}
            defaultValue={user.nombre}
          />
        </FormField>
        <FormField label="Apellido">
          <Input
            aria-label="Apellido"
            name="apellido"
            required
            maxLength={100}
            defaultValue={user.apellido}
          />
        </FormField>
        {canManageRoles && (
          <FormField label="Rol">
            <Choice
              label="Rol"
              value={role}
              onChange={setRole}
              options={roles}
            />
          </FormField>
        )}
        <FormField label="Estado">
          <Choice
            label="Estado del usuario"
            value={status}
            onChange={setStatus}
            options={[
              { value: "activo", label: "Activo" },
              { value: "inactivo", label: "Inactivo" }
            ]}
          />
        </FormField>
      </ActionForm>
    </Modal>
  )
}

export function Users({
  currentUserId,
  superadmin,
  onChange
}: {
  currentUserId: number
  superadmin: boolean
  onChange: () => void
}) {
  const [status, setStatus] = useState("")
  const [editing, setEditing] = useState<Usuario>()
  const load = useCallback(
    (signal: AbortSignal) => getUsers(signal, status),
    [status]
  )
  const users = useRemote(load)
  // Defaults match the checked-in DB seed; observed user roles take precedence.
  const roleIds = new Map([
    ["admin", 1],
    ["usuario", 2]
  ])
  for (const user of users.data ?? [])
    if (user.rol && user.rol !== "superadmin" && user.id_rol)
      roleIds.set(user.rol, user.id_rol)
  const roles = [...roleIds].map(([label, id]) => ({
    value: String(id),
    label:
      label === "admin" ? "Administrador" : label === "usuario" ? "Usuario" : label
  }))
  function changed() {
    users.reload()
    onChange()
  }

  return (
    <Section
      id="users"
      title="Usuarios"
      description="Gestiona roles y estados de cuenta."
      action={
        <div className="w-full md:w-44">
          <Choice
            label="Filtrar usuarios por estado"
            value={status}
            onChange={setStatus}
            options={[
              { value: "", label: "Todos los estados" },
              { value: "activo", label: "Activo" },
              { value: "inactivo", label: "Inactivo" }
            ]}
          />
        </div>
      }
    >
      <RemoteState {...users} />
      {users.data && (
        <Card className="gap-0 py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Matrícula</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!users.data.length && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-10 text-center text-muted-foreground"
                  >
                    No hay usuarios con este estado. Prueba otro filtro.
                  </TableCell>
                </TableRow>
              )}
              {users.data.map((user) => (
                <TableRow key={user.id_usuario}>
                  <TableCell className="font-medium">
                    {user.nombre} {user.apellido}
                    {user.id_usuario === currentUserId && (
                      <span className="ml-2 text-[13px] text-muted-foreground">
                        Tú
                      </span>
                    )}
                  </TableCell>
                  <TableCell>{user.matricula}</TableCell>
                  <TableCell>{user.rol === "superadmin" ? "Superadministrador" : user.rol === "admin" ? "Administrador" : user.rol === "usuario" ? "Usuario" : (user.rol ?? "Sin asignar")}</TableCell>
                  <TableCell>
                    <Status value={user.estatus} />
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      {user.id_usuario === currentUserId ? (
                        <Button
                          size="sm"
                          variant="outline"
                          nativeButton={false}
                          role="link"
                          render={<a href="#profile" />}
                        >
                          Editar mi perfil
                        </Button>
                      ) : user.rol === "superadmin" ? null : (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditing(user)}
                          >
                            Editar
                          </Button>
                          {user.estatus === "activo" && (
                            <ConfirmAction
                              size="sm"
                              label="Desactivar usuario"
                              description={`${user.nombre} ${user.apellido} perderá el acceso y se cerrará su sesión.`}
                              action={() => deactivateUser(user.id_usuario)}
                              onDone={changed}
                            />
                          )}
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
      {editing && (
        <UserEditor
          user={editing}
          roles={roles}
          canManageRoles={superadmin}
          onClose={() => setEditing(undefined)}
          onChange={changed}
        />
      )}
    </Section>
  )
}
