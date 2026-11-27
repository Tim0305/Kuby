import { useCallback, useState } from "react"
import { Button, Card, CardContent, Input } from "@/components/ui"
import { getSpaceQR, saveCheckInSettings } from "@/lib/api"
import type { ConfiguracionCheckIn, Espacio } from "@/lib/api"
import { useRemote } from "@/hooks/use-remote"
import type { RemoteResult } from "@/hooks/use-remote"
import { ActionForm, FormField, Modal, RemoteState, Section } from "@/features/shared"

export function CheckInWindow({ settings }: { settings?: ConfiguracionCheckIn }) {
  return <p className="text-sm/[1.7]">
    Confirma con el código QR
    {settings && `, ${settings.minutos_antes} minutos antes hasta ${settings.minutos_despues} minutos después de tu reservación.`}
  </p>
}

export function CheckInSettings({ resource }: { resource: RemoteResult<ConfiguracionCheckIn> }) {
  const [saved, setSaved] = useState(false)
  return <Section id="check-in-settings" title="Horario de check-in"
    description="Define cuándo se puede confirmar la llegada. Los cambios se aplican también a reservaciones pendientes; las que ya se liberaron conservan su estado.">
    <Card><CardContent>
      <RemoteState {...resource} />
      {resource.data && <ActionForm
        key={`${resource.data.minutos_antes}-${resource.data.minutos_despues}`}
        submit="Guardar horario de check-in"
        action={async (values) => {
          setSaved(false)
          await saveCheckInSettings({ minutos_antes: Number(values.get("before")), minutos_despues: Number(values.get("after")) })
        }}
        onDone={() => { setSaved(true); resource.reload() }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Minutos antes del inicio" hint="De 0 a 180 minutos.">
            <Input name="before" type="number" min={0} max={180} step={1} required defaultValue={resource.data.minutos_antes} />
          </FormField>
          <FormField label="Minutos después del inicio" hint="De 0 a 180 minutos.">
            <Input name="after" type="number" min={0} max={180} step={1} required defaultValue={resource.data.minutos_despues} />
          </FormField>
        </div>
        <p className="text-sm text-muted-foreground">Sin confirmación a tiempo, la reservación se libera. La llegada anticipada no adelanta el horario de acceso al cubículo.</p>
      </ActionForm>}
      {saved && <p role="status" className="mt-4 text-sm text-primary">Horario de check-in guardado.</p>}
    </CardContent></Card>
  </Section>
}

export function SpaceQRDialog({ space, onClose }: { space: Espacio; onClose: () => void }) {
  const load = useCallback((signal: AbortSignal) => getSpaceQR(space.id_espacio, signal), [space.id_espacio])
  const resource = useRemote(load)
  const image = resource.data ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(resource.data.svg)}` : undefined
  return <Modal title={`Código QR · ${space.nombre_espacio}`}
    description="Imprime este código y colócalo en el cubículo. El enlace se conserva aunque edites sus datos."
    onClose={onClose}>
    <RemoteState {...resource} />
    {resource.data && image && <div className="space-y-4">
      <img src={image} alt={`Código QR para registrar la llegada a ${space.nombre_espacio}`} width={512} height={512} className="mx-auto h-auto w-full max-w-72 bg-white" />
      <Button nativeButton={false} render={<a href={`/api/espacios/${space.id_espacio}/qr?descargar=1`} download={`kuby-cubiculo-${space.id_espacio}.svg`} />} className="min-h-11 w-full">Descargar código QR</Button>
      <a href={resource.data.url} className="block min-h-11 break-all text-sm text-primary underline underline-offset-4">Abrir página de check-in</a>
    </div>}
  </Modal>
}
