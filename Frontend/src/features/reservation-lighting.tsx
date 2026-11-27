import { useRef } from "react"
import type { KeyboardEvent, PointerEvent } from "react"
import { LightbulbIcon } from "@phosphor-icons/react"
import { Button } from "@/components/ui"
import type { Reservacion } from "@/lib/api"
import {
  adjustHueSaturation,
  hsvToHex,
  pointToHueSaturation
} from "@/lib/color-wheel"
import type { HueSaturation } from "@/lib/color-wheel"

function ColorWheel({
  value,
  onValueChange,
  disabled = false
}: {
  value: HueSaturation | null
  onValueChange?: (value: HueSaturation) => void
  disabled?: boolean
}) {
  const wheel = useRef<HTMLDivElement>(null)
  const activePointer = useRef<number | null>(null)
  const unavailable = disabled || !value || !onValueChange
  const color = value
    ? hsvToHex(value.hue, value.saturation)
    : undefined
  const angle = value ? (value.hue * Math.PI) / 180 : 0
  const markerStyle = value
    ? {
        left: `${50 + Math.cos(angle) * value.saturation * 50}%`,
        top: `${50 + Math.sin(angle) * value.saturation * 50}%`
      }
    : undefined

  function selectAt(event: PointerEvent<HTMLDivElement>) {
    if (unavailable || !wheel.current) return
    onValueChange?.(
      pointToHueSaturation(
        event.clientX,
        event.clientY,
        wheel.current.getBoundingClientRect()
      )
    )
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (unavailable || !value) return
    const next = adjustHueSaturation(value, event.key, event.shiftKey)
    if (!next) return
    event.preventDefault()
    onValueChange?.(next)
  }

  return (
    <div className="mx-auto w-full max-w-64">
      <div
        ref={wheel}
        role={value ? "group" : undefined}
        aria-label={
          value && color
            ? `Selector de color. ${color}, tono ${Math.round(value.hue)} grados, saturación ${Math.round(value.saturation * 100)} por ciento`
            : undefined
        }
        aria-describedby={value ? "color-wheel-help" : undefined}
        aria-disabled={unavailable || undefined}
        tabIndex={value && !unavailable ? 0 : undefined}
        onKeyDown={onKeyDown}
        onPointerDown={(event) => {
          if (unavailable) return
          event.currentTarget.setPointerCapture(event.pointerId)
          activePointer.current = event.pointerId
          selectAt(event)
        }}
        onPointerMove={(event) => {
          if (activePointer.current === event.pointerId) selectAt(event)
        }}
        onPointerUp={(event) => {
          if (activePointer.current !== event.pointerId) return
          activePointer.current = null
          if (event.currentTarget.hasPointerCapture(event.pointerId))
            event.currentTarget.releasePointerCapture(event.pointerId)
        }}
        onPointerCancel={() => {
          activePointer.current = null
        }}
        className={`relative aspect-square touch-none rounded-full ${
          unavailable
            ? "cursor-not-allowed opacity-70"
            : "cursor-crosshair focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-visit-accent"
        }`}
      >
        <div
          aria-hidden="true"
          className="absolute inset-0 rounded-full shadow-inner"
          style={{
            background:
              "radial-gradient(circle, #fff 0%, transparent 72%), conic-gradient(from 90deg, #ff3b30, #ffcc00, #34c759, #00c7be, #007aff, #af52de, #ff2d55, #ff3b30)"
          }}
        />
        {value && markerStyle && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute size-7 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_1px_8px_rgb(0_0_0/0.55)] ring-1 ring-black/25"
            style={{ ...markerStyle, backgroundColor: color }}
          />
        )}
      </div>
      {value && (
        <p id="color-wheel-help" className="sr-only">
          Usa las flechas izquierda y derecha para cambiar el tono, y arriba y
          abajo para cambiar la saturación. Mantén Shift para hacer ajustes
          mayores.
        </p>
      )}
    </div>
  )
}

export function ReservationLighting({
  reservation
}: {
  reservation: Reservacion
}) {
  if (!["creada", "activa"].includes(reservation.estado_reservacion)) return null

  return (
    <div className="mt-4 border-t border-visit-muted/25 pt-4">
      <div className="rounded-lg border border-visit-muted/20 bg-black/10 p-4 sm:p-5">
        <div className="flex items-center gap-2">
          <LightbulbIcon
            aria-hidden="true"
            className="size-5 text-visit-accent"
          />
        <p className="mt-1 text-sm text-visit-muted">
          Personaliza el color de la luz de tu cubículo
        </p>
        </div>

        <div className="mt-5 grid min-w-0 gap-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] sm:items-center">
          <ColorWheel value={null} disabled />
          <div className="min-w-0 space-y-3">
            <div className="flex items-center gap-3">
              <span
                aria-hidden="true"
                className="size-9 shrink-0 rounded-full border"
              />
              <div>
                <p className="text-sm font-medium">Color seleccionado</p>
                <p className="text-sm text-visit-muted">No disponible</p>
              </div>
            </div>
            <p role="status" className="text-sm text-visit-muted">
              En proceso de hacer esta parte
            </p>
            <div className="flex flex-row gap-2">
              <Button size="sm" disabled>
                Guardar color
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
