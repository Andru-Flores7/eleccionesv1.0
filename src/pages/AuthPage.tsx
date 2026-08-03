import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Crown } from "lucide-react";
import { usePageTitle } from "@/hooks/use-page-title";

export default function AuthPage() {
  usePageTitle("Admin — Reina de Jujuy");
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin + "/admin" },
        });
        if (error) throw error;
        toast.success("Cuenta creada. Ya podés ingresar.");
        setMode("signin");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Bienvenido/a");
        navigate("/admin");
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        toast.error(err.message ?? "Error");
      } else {
        toast.error("Error desconocido");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-jujuy flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-3xl bg-card p-8 shadow-soft">
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          ← Volver
        </Link>
        <div className="mb-6 flex items-center gap-2">
          <Crown className="h-6 w-6 text-primary" />
          <h1 className="font-display text-2xl">Panel de administración</h1>
        </div>
        <p className="mb-6 text-sm text-muted-foreground">
          {mode === "signup"
            ? "El primer usuario registrado se convierte automáticamente en administrador."
            : "Ingresá con tu cuenta de administrador."}
        </p>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Contraseña</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
          >
            {loading ? "..." : mode === "signup" ? "Crear cuenta" : "Ingresar"}
          </button>
        </form>
        {/*  <button
          type="button"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="mt-4 w-full text-sm text-muted-foreground hover:text-foreground"
        >
          {mode === "signin" ? "¿No tenés cuenta? Registrate" : "Ya tengo cuenta"}
        </button>*/}
      </div>
    </div>
  );
}
