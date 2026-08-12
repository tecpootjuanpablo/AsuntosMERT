import React, { useState } from "react";
import { X } from "lucide-react";
import { T } from "../theme.js";

const TIPOS = ["Promoción", "Auto", "Sentencia", "Audiencia", "Notificación", "Oficio"];

export default function NuevaActuacionModal({ onClose, onSubmit }) {
  const [form, setForm] = useState({
    tipo: "Promoción",
    fecha_acuerdo: "",
    fecha_notificacion: "",
    resumen: "",
    foja: "",
    termino_dias_otorgados: "",
    termino_fecha_limite: "",
    documento_texto: "",
  });
  const [saving, setSaving] = useState(false);

  function set(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    await onSubmit({
      tipo: form.tipo,
      fecha_acuerdo: form.fecha_acuerdo,
      fecha_notificacion: form.fecha_notificacion || null,
      resumen: form.resumen,
      foja: Number(form.foja),
      termino_dias_otorgados: form.termino_dias_otorgados ? Number(form.termino_dias_otorgados) : null,
      termino_fecha_limite: form.termino_fecha_limite || null,
      documento_texto: form.documento_texto || null,
    });
    setSaving(false);
  }

  return (
    <div style={overlayStyle}>
      <form onSubmit={handleSubmit} className="ed-sans" style={modalStyle}>
        <div style={headerStyle}>
          <h3 className="ed-serif" style={{ margin: 0, fontSize: 16, color: T.ink }}>Nueva actuación</h3>
          <button type="button" onClick={onClose} style={closeBtnStyle}><X size={16} /></button>
        </div>

        <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 12, maxHeight: "70vh", overflowY: "auto" }} className="ed-scroll">
          <Field label="Tipo de actuación">
            <select value={form.tipo} onChange={(e) => set("tipo", e.target.value)} style={inputStyle} required>
              {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>

          <div style={{ display: "flex", gap: 10 }}>
            <Field label="Fecha de acuerdo" style={{ flex: 1 }}>
              <input type="date" value={form.fecha_acuerdo} onChange={(e) => set("fecha_acuerdo", e.target.value)} style={inputStyle} required />
            </Field>
            <Field label="Fecha de notificación" style={{ flex: 1 }}>
              <input type="date" value={form.fecha_notificacion} onChange={(e) => set("fecha_notificacion", e.target.value)} style={inputStyle} />
            </Field>
          </div>

          <Field label="Foja">
            <input type="number" min="1" value={form.foja} onChange={(e) => set("foja", e.target.value)} style={inputStyle} required />
          </Field>

          <Field label="Resumen técnico">
            <textarea rows={3} value={form.resumen} onChange={(e) => set("resumen", e.target.value)} style={{ ...inputStyle, resize: "vertical" }} required />
          </Field>

          <div style={{ borderTop: `1px dashed ${T.line}`, paddingTop: 10 }}>
            <p style={{ fontSize: 11.5, color: T.slate, margin: "0 0 8px" }}>
              Término procesal (opcional) — si el juez concedió un plazo, indica cuántos días y la fecha límite exacta.
              El semáforo se calcula automáticamente comparando esa fecha contra el día de hoy.
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <Field label="Días otorgados" style={{ flex: 1 }}>
                <input type="number" min="1" value={form.termino_dias_otorgados} onChange={(e) => set("termino_dias_otorgados", e.target.value)} style={inputStyle} />
              </Field>
              <Field label="Fecha límite" style={{ flex: 1 }}>
                <input type="date" value={form.termino_fecha_limite} onChange={(e) => set("termino_fecha_limite", e.target.value)} style={inputStyle} />
              </Field>
            </div>
          </div>

          <Field label="Texto del documento (opcional, para el visor)">
            <textarea rows={5} value={form.documento_texto} onChange={(e) => set("documento_texto", e.target.value)} style={{ ...inputStyle, resize: "vertical" }} placeholder="Pega aquí el contenido del acuerdo. Usa líneas en blanco para separar párrafos." />
          </Field>
        </div>

        <div style={footerStyle}>
          <button type="button" onClick={onClose} style={secondaryBtn}>Cancelar</button>
          <button type="submit" disabled={saving} style={primaryBtn}>{saving ? "Guardando…" : "Guardar actuación"}</button>
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
const modalStyle = { background: T.paperPanel, borderRadius: 8, width: "100%", maxWidth: 480, boxShadow: "0 20px 50px rgba(0,0,0,0.35)", overflow: "hidden" };
const headerStyle = { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderBottom: `1px solid ${T.line}` };
const closeBtnStyle = { background: "none", border: "none", cursor: "pointer", color: T.slate, display: "flex" };
const footerStyle = { display: "flex", justifyContent: "flex-end", gap: 8, padding: "12px 20px", borderTop: `1px solid ${T.line}`, background: T.paper };
const inputStyle = { width: "100%", padding: "8px 10px", border: `1px solid ${T.line}`, borderRadius: 4, fontSize: 13, color: T.ink, background: T.paperInk, outline: "none" };
const primaryBtn = { padding: "8px 16px", background: T.ink, color: T.paperPanel, border: "none", borderRadius: 4, fontSize: 13, fontWeight: 600, cursor: "pointer" };
const secondaryBtn = { padding: "8px 16px", background: "none", color: T.inkSoft, border: `1px solid ${T.line}`, borderRadius: 4, fontSize: 13, fontWeight: 500, cursor: "pointer" };
