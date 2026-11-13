import type { ReactNode } from "react"

// Shared centered layout from shadcn's login-03 and signup-03 blocks.
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-svh flex-1 flex-col items-center justify-center gap-6 bg-background px-5 py-8 text-left sm:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <a href="/login" aria-label="Inicio de Kuby" className="self-center outline-offset-4 focus-visible:outline-2 focus-visible:outline-ring">
          <img src="/assets/LogoKuby.png" alt="Kuby" className="h-11 w-auto object-contain invert dark:invert-0" />
        </a>
        {children}
      </div>
    </main>
  )
}
