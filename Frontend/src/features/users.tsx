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
  onClose,
  onChange
}: {
  user: Usuario
  roles: { value: string; label: string }[]
  onClose: () => void
  onChange: () => void
}) {
  const [role, setRole] = useState(String(user.id_rol ?? ""))
  const [status, setStatus] = useState(user.estatus)
  return (
    <Modal
      title="Edit user"
      description={`${user.matricula} · Passwords can only be changed by the account owner.`}
      onClose={onClose}
    >
      <ActionForm
        action={async (values) => {
          await updateUser(user.id_usuario, {
            nombre: text(values, "nombre"),
            apellido: text(values, "apellido"),
            ...(role ? { id_rol: Number(role) } : {}),
            estatus: status as "activo" | "inactivo"
          })
        }}
        onDone={() => {
          onChange()
          onClose()
        }}
      >
        <FormField label="First name">
          <Input
            aria-label="First name"
            name="nombre"
            required
            maxLength={100}
            defaultValue={user.nombre}
          />
        </FormField>
        <FormField label="Last name">
          <Input
            aria-label="Last name"
            name="apellido"
            required
            maxLength={100}
            defaultValue={user.apellido}
          />
        </FormField>
        <FormField label="Role">
          <Choice
            label="Role"
            value={role}
            onChange={setRole}
            options={roles}
          />
        </FormField>
        <FormField label="Status">
          <Choice
            label="User status"
            value={status}
            onChange={setStatus}
            options={[
              { value: "activo", label: "Active" },
              { value: "inactivo", label: "Inactive" }
            ]}
          />
        </FormField>
      </ActionForm>
    </Modal>
  )
}

export function Users({
  currentUserId,
  onChange
}: {
  currentUserId: number
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
    if (user.rol && user.id_rol) roleIds.set(user.rol, user.id_rol)
  const roles = [...roleIds].map(([label, id]) => ({
    value: String(id),
    label:
      label === "admin" ? "Administrator" : label === "usuario" ? "User" : label
  }))
  function changed() {
    users.reload()
    onChange()
  }

  return (
    <Section
      id="users"
      title="Users"
      description="Manage account access and roles."
      action={
        <div className="w-44">
          <Choice
            label="Filter users by status"
            value={status}
            onChange={setStatus}
            options={[
              { value: "", label: "All statuses" },
              { value: "activo", label: "Active" },
              { value: "inactivo", label: "Inactive" }
            ]}
          />
        </div>
      }
    >
      <RemoteState {...users} />
      {users.data && (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Student ID</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!users.data.length && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-10 text-center text-muted-foreground"
                  >
                    No users match this filter.
                  </TableCell>
                </TableRow>
              )}
              {users.data.map((user) => (
                <TableRow key={user.id_usuario}>
                  <TableCell className="font-medium">
                    {user.nombre} {user.apellido}
                    {user.id_usuario === currentUserId && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        You
                      </span>
                    )}
                  </TableCell>
                  <TableCell>{user.matricula}</TableCell>
                  <TableCell>{user.rol ?? "Unassigned"}</TableCell>
                  <TableCell>
                    <Status value={user.estatus} />
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      {user.id_usuario === currentUserId ? (
                        <Button
                          variant="outline"
                          nativeButton={false}
                          role="link"
                          render={<a href="#profile" />}
                        >
                          Edit my profile
                        </Button>
                      ) : (
                        <>
                          <Button
                            variant="outline"
                            onClick={() => setEditing(user)}
                          >
                            Edit
                          </Button>
                          {user.estatus === "activo" && (
                            <ConfirmAction
                              label="Deactivate user"
                              description={`Deactivate ${user.nombre} ${user.apellido}? They will lose access, including their current session.`}
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
          onClose={() => setEditing(undefined)}
          onChange={changed}
        />
      )}
    </Section>
  )
}
