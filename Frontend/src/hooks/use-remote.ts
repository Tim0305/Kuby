import { useCallback, useEffect, useState } from "react"

export type RemoteResult<T> = {
  data: T | undefined
  error: Error | undefined
  loading: boolean
  reload: () => void
}

/** Keeps each feature's errors independent; discards stale requests and pauses polling in hidden tabs. */
export function useRemote<T>(
  load: (signal: AbortSignal) => Promise<T>,
  refreshMs = 0
): RemoteResult<T> {
  const [state, setState] = useState<{
    load: typeof load
    data?: T
    error?: Error
    loading: boolean
  }>({ load, loading: true })
  const [version, setVersion] = useState(0)
  const reload = useCallback(() => setVersion((value) => value + 1), [])

  useEffect(() => {
    let controller: AbortController | undefined
    let disposed = false
    async function run() {
      controller?.abort()
      const current = new AbortController()
      controller = current
      // Defer state updates so StrictMode cleanup can discard its initial request.
      await Promise.resolve()
      if (disposed || current.signal.aborted) return
      setState((previous) => ({
        load,
        data: previous.load === load ? previous.data : undefined,
        loading: true
      }))
      try {
        const result = await load(current.signal)
        if (!current.signal.aborted)
          setState({ load, data: result, loading: false })
      } catch (error) {
        if (!current.signal.aborted)
          setState((previous) => ({
            ...previous,
            loading: false,
            error:
              error instanceof Error ? error : new Error("No se pudieron cargar los datos.")
          }))
      }
    }
    void run()
    const refresh = () => {
      if (!document.hidden) void run()
    }
    const interval = refreshMs
      ? window.setInterval(refresh, refreshMs)
      : undefined
    if (refreshMs) document.addEventListener("visibilitychange", refresh)
    return () => {
      disposed = true
      controller?.abort()
      window.clearInterval(interval)
      document.removeEventListener("visibilitychange", refresh)
    }
  }, [load, version, refreshMs])

  return {
    data: state.load === load ? state.data : undefined,
    error: state.load === load ? state.error : undefined,
    loading: state.load !== load || state.loading,
    reload
  }
}
