import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";

export default function Login() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setError(""); setBusy(true);
    try {
      if (mode === "login") await login(email, password);
      else await register(email, password);
      navigate("/list");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section>
      <div className="page-head">
        <h1 className="page-title">
          <span className="kick">// {mode === "login" ? "Welcome back" : "Join"}</span>
          {mode === "login" ? "Log in" : "Sign up"}
        </h1>
      </div>

      <div className="auth-card">
        <label className="auth-label">Email</label>
        <input className="auth-input" type="email" value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()} autoFocus />

        <label className="auth-label">Password</label>
        <input className="auth-input" type="password" value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()} placeholder="6+ characters" />

        {error && <div className="notice error" style={{ marginTop: 14 }}>⚠ {error}</div>}

        <button className="btn-stamp btn-add" style={{ marginTop: 18, width: "100%" }} onClick={submit} disabled={busy}>
          {busy ? "…" : mode === "login" ? "Log in" : "Create account"}
        </button>

        <button className="auth-switch" onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}>
          {mode === "login" ? "No account yet? Sign up" : "Already have an account? Log in"}
        </button>
      </div>
    </section>
  );
}