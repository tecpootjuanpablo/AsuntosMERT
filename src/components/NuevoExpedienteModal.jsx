import React, { useState } from "react";
import { X } from "lucide-react";
import { T } from "../theme.js";

export default function NuevoExpedienteModal({ onClose, onSubmit }) {
  const [form, setForm] = useState({
    numero: "", juzgado: "", materia: "", actor: "", demandado: "", fojas_totales: "",
  });
  const [saving, setSaving] = useState(false);

  function set(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    await onSubmit({
      numero: form.numero,
      juzgado: form.juzgado,
      materia: form.materia,
      actor: form.actor,
      demandado: form.demandado,
      fojas_totales: form.fojas_totales ? Number(form.fojas_totales) : 0,
    });
    setSaving(false);
  }

  return (
    <div style={overlayStyle}>
      <form onSubmit={handleSubmit} className="ed-sans" style={modalStyle}>
        <div style={headerStyle}>
          <h3 className="ed-serif" style={{ margin: 0, fontSize: 16, color: T.ink }}>Nuevo expediente</h3>
          <button type="button" onClick={onClose} style={closeBtnStyle}><X size={16} /></button>
        </div>

        <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
          <Field label="Número de expediente">
            <input value={form.numero} onChange={(e) => set("numero", e.target.value)} placeholder="245/2024" style={inputStyle} required />
          </Field>
          <Field label="Juzgado">
            <input value={form.juzgado} onChange={(e) => set("juzgado", e.target.value)} placeholder="Juzgado Tercero de lo Familiar..." style={inputStyle} required />
          </Field>
          <Field label="Materia">
            <input value={form.materia} onChange={(e) => set("materia", e.target.value)} placeholder="Divorcio Incausado y Alimentos" style={inputStyle} required />
          </Field>
          <div style={{ display: "flex", gap: 10 }}>
            <Field label="Actor" style={{ flex: 1 }}>
              <input value={form.actor} onChange={(e) => set("actor", e.target.value)} style={inputStyle} required />
            </Field>
            <Field label="Demandado" style={{ flex: 1 }}>
              <input value={form.demandado} onChange={(e) => set("demandado", e.target.value)} style={inputStyle} required />
            </Field>
          </div>
          <Field label="Fojas totales (aprox.)">
            <input type="number" min="0" value={form.fojas_totales} onChange={(e) => set("fojas_totales", e.target.value)} style={inputStyle} />
          </Field>
        </div>

        <div style={footerStyle}>
          <button type="button" onClick={onClose} style={secondaryBtn}>Cancelar</button>
          <button type="submit" disabled={saving} style={primaryBtn}>{saving ? "Creando…" : "Crear expediente"}</button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children, style }) {
  return (
    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: T.inkSoft, ...style }}>
      {label}
      <div style={{ marginTop: 4, fontWeight: 400 }}>{children}</div>
    </label>
  );
}

const overlayStyle = { position: "fixed", inset: 0, background: "rgba(24,35,56,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16 };
const modalStyle = { background: T.paperPanel, borderRadius: 8, width: "100%", maxWidth: 440, boxShadow: "0 20px 50px rgba(0,0,0,0.35)", overflow: "hidden" };
const headerStyle = { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderBottom: `1px solid ${T.line}` };
const closeBtnStyle = { background: "none", border: "none", cursor: "pointer", color: T.slate, display: "flex" };
const footerStyle = { display: "flex", justifyContent: "flex-end", gap: 8, padding: "12px 20px", borderTop: `1px solid ${T.line}`, background: T.paper };
const inputStyle = { width: "100%", padding: "8px 10px", border: `1px solid ${T.line}`, borderRadius: 4, fontSize: 13, color: T.ink, background: T.paperInk, outline: "none" };
const primaryBtn = { padding: "8px 16px", background: T.ink, color: T.paperPanel, border: "none", borderRadius: 4, fontSize: 13, fontWeight: 600, cursor: "pointer" };
const secondaryBtn = { padding: "8px 16px", background: "none", color: T.inkSoft, border: `1px solid ${T.line}`, borderRadius: 4, fontSize: 13, fontWeight: 500, cursor: "pointer" };
