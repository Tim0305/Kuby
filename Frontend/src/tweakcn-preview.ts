const TWEAKCN_PREVIEW_URL = "https://tweakcn.com/live-preview.min.js"
const TWEAKCN_SCRIPT_ID = "tweakcn-live-preview"

export function loadTweakcnPreview() {
  if (!import.meta.env.DEV || document.getElementById(TWEAKCN_SCRIPT_ID)) {
    return
  }

  const script = document.createElement("script")
  script.id = TWEAKCN_SCRIPT_ID
  script.src = TWEAKCN_PREVIEW_URL
  script.async = true
  script.onerror = () => {
    console.warn("Tweakcn live preview could not be loaded.")
  }
  document.head.appendChild(script)
}
