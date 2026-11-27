export type HueSaturation = {
  hue: number
  saturation: number
}

export type WheelBounds = {
  left: number
  top: number
  width: number
  height: number
}

function normalizeHue(hue: number): number {
  if (!Number.isFinite(hue)) return 0
  return ((hue % 360) + 360) % 360
}

function clampSaturation(saturation: number): number {
  if (!Number.isFinite(saturation)) return 0
  return Math.min(1, Math.max(0, saturation))
}

export function hsvToHex(hue: number, saturation: number): string {
  const h = normalizeHue(hue) / 60
  const s = clampSaturation(saturation)
  const chroma = s
  const x = chroma * (1 - Math.abs((h % 2) - 1))
  const match = 1 - chroma
  const [red, green, blue] =
    h < 1 ? [chroma, x, 0]
      : h < 2 ? [x, chroma, 0]
        : h < 3 ? [0, chroma, x]
          : h < 4 ? [0, x, chroma]
            : h < 5 ? [x, 0, chroma]
              : [chroma, 0, x]
  const toHex = (value: number) =>
    Math.round((value + match) * 255).toString(16).padStart(2, "0")

  return `#${toHex(red)}${toHex(green)}${toHex(blue)}`.toUpperCase()
}

export function hexToHueSaturation(hex: string): HueSaturation | null {
  if (!/^#[\da-f]{6}$/i.test(hex)) return null
  const red = parseInt(hex.slice(1, 3), 16) / 255
  const green = parseInt(hex.slice(3, 5), 16) / 255
  const blue = parseInt(hex.slice(5, 7), 16) / 255
  const maximum = Math.max(red, green, blue)
  const minimum = Math.min(red, green, blue)
  const delta = maximum - minimum

  let hue = 0
  if (delta !== 0) {
    if (maximum === red) hue = 60 * (((green - blue) / delta) % 6)
    else if (maximum === green) hue = 60 * ((blue - red) / delta + 2)
    else hue = 60 * ((red - green) / delta + 4)
  }

  return {
    hue: normalizeHue(hue),
    saturation: maximum === 0 ? 0 : delta / maximum
  }
}

export function adjustHueSaturation(
  value: HueSaturation,
  key: string,
  largerStep = false
): HueSaturation | null {
  const hueStep = largerStep ? 10 : 2
  const saturationStep = largerStep ? 0.1 : 0.02

  switch (key) {
    case "ArrowLeft":
      return { ...value, hue: normalizeHue(value.hue - hueStep) }
    case "ArrowRight":
      return { ...value, hue: normalizeHue(value.hue + hueStep) }
    case "ArrowUp":
      return {
        ...value,
        saturation: clampSaturation(value.saturation + saturationStep)
      }
    case "ArrowDown":
      return {
        ...value,
        saturation: clampSaturation(value.saturation - saturationStep)
      }
    default:
      return null
  }
}

export function pointToHueSaturation(
  clientX: number,
  clientY: number,
  bounds: WheelBounds
): HueSaturation {
  const radius = Math.min(bounds.width, bounds.height) / 2
  if (radius <= 0) return { hue: 0, saturation: 0 }

  const dx = clientX - (bounds.left + bounds.width / 2)
  const dy = clientY - (bounds.top + bounds.height / 2)
  const distance = Math.hypot(dx, dy)
  const saturation = clampSaturation(distance / radius)
  const hue = distance === 0
    ? 0
    : normalizeHue(Math.atan2(dy, dx) * (180 / Math.PI))

  return { hue, saturation }
}
