import { getCurrentUser, login } from "@/lib/api"
import { homeFor } from "@/lib/auth-routing"
import { AuthShell } from "@/components/auth-shell"
import { LoginForm } from "@/components/login-form"
import { SignupForm } from "@/components/signup-form"

export function AuthPage({ signup = false }: { signup?: boolean }) {
  async function handleLogin(matricula: string, password: string) {
    await login(matricula, password)
    const user = await getCurrentUser()
    window.location.replace(homeFor(user))
  }

  return <AuthShell>{signup ? <SignupForm onLogin={handleLogin} /> : <LoginForm onLogin={handleLogin} />}</AuthShell>
}
