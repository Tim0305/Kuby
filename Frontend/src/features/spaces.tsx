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
      description="Completa los datos del cubículo."
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
          <FormField label="Capacidad (personas)">
            <Input
              aria-label="Capacidad (personas)"
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
      title={admin ? "Cubículos" : "Cubículos"}
      description=""
      action={
        admin && (
          <Button onClick={() => setEditor("new")} className="w-full md:w-auto">
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
            Aún no hay cubículos.
          </CardContent>
        </Card>
      )}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-[repeat(auto-fit,minmax(min(100%,300px),1fr))]">
        {resource.data?.map((space) => (
          <Card key={space.id_espacio} className="min-w-0 motion-safe:transition-colors motion-safe:duration-150 hover:border-input">
            <CardHeader className="gap-1">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <span className="text-[13px] text-muted-foreground tabular-nums">
                  Cubículo {String(space.id_espacio).padStart(2, "0")}
                </span>
                <Status value={space.estado_espacio} />
              </div>
              <CardTitle className="text-[22px]/[1.3] tracking-[-0.035em] wrap-anywhere">{space.nombre_espacio}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col justify-between gap-6">
              <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                <p className="flex items-start gap-2">
                  <MapPinIcon className="mt-px size-4.5 shrink-0" />
                  {space.ubicacion || "Sin ubicación registrada"}
                </p>
                <p className="flex items-center gap-2">
                  <UsersIcon className="mt-px size-4.5 shrink-0" />
                  Hasta {space.capacidad} {space.capacidad === 1 ? "persona" : "personas"}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 border-t border-border pt-5">
                <Button
                  className="w-full md:w-auto"
                  disabled={space.estado_espacio !== "activo"}
                  onClick={() => setBooking(space)}
                >
                  {space.estado_espacio === "activo"
                    ? "Reservar cubículo"
                    : "No disponible"}
                </Button>
                {admin && (
                  <>
                    <Button variant="outline" className="flex-1 md:flex-none" onClick={() => setEditor(space)}>
                      Editar
                    </Button>
                    {space.estado_espacio !== "inactivo" && (
                      <ConfirmAction
                        label="Desactivar"
                        description={`${space.nombre_espacio} dejará de aceptar reservaciones nuevas. Las existentes se conservarán.`}
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
