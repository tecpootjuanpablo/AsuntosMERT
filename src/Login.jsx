import React, { useState } from "react";
import { Scale, AlertCircle } from "lucide-react";
import { T } from "./theme.js";
import { supabase } from "./supabaseClient.js";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(
        error.message === "Invalid login credentials"
          ? "Correo o contraseña incorrectos, o tu cuenta aún no ha sido dada de alta por el administrador."
          : error.message
      );
    }
  }

  return (
    <div
      className="ed-sans"
      style={{
        minHeight: "100vh",
        background: T.paper,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          background: T.paperPanel,
          border: `1px solid ${T.line}`,
          borderTop: `3px solid ${T.brass}`,
          borderRadius: 6,
          padding: "32px 32px 28px",
          width: "100%",
          maxWidth: 380,
          boxShadow: "0 8px 30px rgba(24,35,56,0.08)",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 22 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              border: `1.5px solid ${T.brass}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 12,
            }}
          >
            <Scale size={20} color={T.brass} strokeWidth={1.8} />
          </div>
          <h1 className="ed-serif" style={{ fontSize: 19, fontWeight: 600, margin: 0, color: T.ink }}>
            Control de Expedientes
          </h1>
          <p style={{ fontSize: 12.5, color: T.slate, margin: "4px 0 0" }}>Acceso exclusivo para socios autorizados</p>
        </div>

        <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: T.inkSoft, marginBottom: 5 }}>
          Correo
        </label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tu@despacho.com"
          style={inputStyle}
        />

        <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: T.inkSoft, margin: "14px 0 5px" }}>
          Contraseña
        </label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          style={inputStyle}
        />

        {error && (
          <div
            style={{
              display: "flex",
              gap: 8,
              alignItems: "flex-start",
              background: T.redBg,
              color: T.red,
              border: `1px solid ${T.redLine}`,
              borderRadius: 4,
              padding: "9px 11px",
              fontSize: 12,
              marginTop: 14,
              lineHeight: 1.4,
            }}
          >
            <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>{error}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%",
            marginTop: 18,
            padding: "10px 0",
            background: T.ink,
            color: T.paperPanel,
            border: "none",
            borderRadius: 4,
            fontSize: 13.5,
            fontWeight: 600,
            cursor: loading ? "default" : "pointer",
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? "Verificando…" : "Entrar"}
        </button>

        <p style={{ fontSize: 11, color: T.slateLight, marginTop: 16, textAlign: "center", lineHeight: 1.5 }}>
          Las cuentas se crean manualmente por el administrador del despacho.
          Si no tienes acceso, solicítalo directamente.
        </p>
      </form>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  padding: "9px 11px",
  border: `1px solid ${T.line}`,
  borderRadius: 4,
  fontSize: 13.5,
  color: T.ink,
  background: T.paperInk,
  outline: "none",
};
