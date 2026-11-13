import { useState } from "react"
import { MapPinIcon, PlusIcon, UsersIcon } from "@phosphor-icons/react"
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input
} from "@/components/ui"
import { createSpace, deactivateSpace, updateSpace } from "@/lib/api"
import type { Espacio, EstadoEspacio } from "@/lib/api"
import type { RemoteResult } from "@/hooks/use-remote"
import { BookingDialog } from "@/features/reservations"
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

function SpaceEditor({
  space,
  onClose,
  onChange
}: {
  space?: Espacio
  onClose: () => void
  onChange: () => void
}) {
  const [status, setStatus] = useState<EstadoEspacio>(
    space?.estado_espacio ?? "activo"
  )
  return (
    <Modal
      title={space ? "Editar cubículo" : "Nuevo cubículo"}
      description="Define la ubicación, la capacidad y el estado operativo."
      onClose={onClose}
    >
      <ActionForm
        submit={space ? "Guardar cambios" : "Crear cubículo"}
        action={async (values) => {
          const data = {
            nombre_espacio: text(values, "name"),
            ubicacion: text(values, "location"),
            capacidad: Number(values.get("capacity")),
            ip_nodo_esp32: text(values, "ip"),
            estado_espacio: status
          }
          if (space) await updateSpace(space.id_espacio, data)
          else await createSpace(data)
        }}
        onDone={() => {
          onChange()
          onClose()
        }}
      >
        <FormField label="Nombre">
          <Input
            aria-label="Nombre"
            name="name"
            required
            maxLength={100}
            defaultValue={space?.nombre_espacio}
          />
        </FormField>
        <FormField label="Ubicación">
          <Input
            aria-label="Ubicación"
            name="location"
            maxLength={100}
            defaultValue={space?.ubicacion ?? ""}
          />
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Capacidad">
            <Input
              aria-label="Capacidad"
              name="capacity"
              type="number"
              min={1}
              step={1}
              required
              defaultValue={space?.capacidad ?? 1}
            />
          </FormField>
          <FormField label="Estado">
            <Choice
              label="Estado del cubículo"
              value={status}
              onChange={(value) => setStatus(value as EstadoEspacio)}
              options={[
                { value: "activo", label: "Activo" },
                { value: "inactivo", label: "Inactivo" },
                { value: "mantenimiento", label: "Mantenimiento" }
              ]}
            />
          </FormField>
        </div>
        <FormField label="Dirección del ESP32 (opcional)">
          <Input
            aria-label="Dirección del ESP32"
            name="ip"
            maxLength={45}
            defaultValue={space?.ip_nodo_esp32 ?? ""}
          />
        </FormField>
      </ActionForm>
    </Modal>
  )
}

export function Spaces({
  resource,
  admin,
  onChange,
  onBooked
}: {
  resource: RemoteResult<Espacio[]>
  admin: boolean
  onChange: () => void
  onBooked: () => void
}) {
  const [booking, setBooking] = useState<Espacio>()
  const [editor, setEditor] = useState<Espacio | "new">()
  return (
    <Section
      id="spaces"
      title={admin ? "Cubículos" : "Explorar cubículos"}
      description="Encuentra un espacio para concentrarte o para tu próxima sesión en equipo."
      action={
        admin && (
          <Button onClick={() => setEditor("new")}>
            <PlusIcon data-icon="inline-start" />
            Nuevo cubículo
          </Button>
        )
      }
    >
      <RemoteState {...resource} />
      {resource.data?.length === 0 && (
        <Card>
          <CardContent className="py-6 text-sm text-muted-foreground">
            Aún no se han agregado cubículos.
          </CardContent>
        </Card>
      )}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {resource.data?.map((space) => (
          <Card key={space.id_espacio}>
            <CardHeader>
              <div className="mb-3 flex items-center justify-between gap-3">
                <span className="font-mono text-xs text-muted-foreground">
                  CUBÍCULO {String(space.id_espacio).padStart(2, "0")}
                </span>
                <Status value={space.estado_espacio} />
              </div>
              <CardTitle className="text-lg">{space.nombre_espacio}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2 text-sm text-muted-foreground">
                <p className="flex items-center gap-2">
                  <MapPinIcon />
                  {space.ubicacion || "Ubicación no especificada"}
                </p>
                <p className="flex items-center gap-2">
                  <UsersIcon />
                  Hasta {space.capacidad} {space.capacidad === 1 ? "persona" : "personas"}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  disabled={space.estado_espacio !== "activo"}
                  onClick={() => setBooking(space)}
                >
                  {space.estado_espacio === "activo"
                    ? "Reservar cubículo"
                    : "No disponible"}
                </Button>
                {admin && (
                  <>
                    <Button variant="outline" onClick={() => setEditor(space)}>
                      Editar
                    </Button>
                    {space.estado_espacio !== "inactivo" && (
                      <ConfirmAction
                        label="Desactivar"
                        description={`¿Quieres desactivar ${space.nombre_espacio}? Se bloquearán las nuevas reservaciones. Las reservaciones existentes permanecerán en el historial.`}
                        action={() => deactivateSpace(space.id_espacio)}
                        onDone={onChange}
                      />
                    )}
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {booking && (
        <BookingDialog
          space={booking}
          onClose={() => setBooking(undefined)}
          onBooked={onBooked}
        />
      )}
      {editor && (
        <SpaceEditor
          space={editor === "new" ? undefined : editor}
          onClose={() => setEditor(undefined)}
          onChange={onChange}
        />
      )}
    </Section>
  )
}
