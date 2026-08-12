import React, { useState } from "react";
import { X, FileCheck, AlertCircle, ExternalLink } from "lucide-react";
import { T } from "../theme.js";
import { supabase } from "../supabaseClient.js";

const TIPOS = ["Promoción", "Auto", "Sentencia", "Audiencia", "Notificación", "Oficio"];
const MAX_MB = 20;

// actuacion: si viene con datos, el modal entra en modo EDICIÓN.
export default function ActuacionModal({ onClose, onSubmit, expedienteId, userId, actuacion, existingPdfUrl }) {
  const isEdit = !!actuacion;

  const [form, setForm] = useState({
    tipo: actuacion?.tipo || "Promoción",
    fecha_acuerdo: actuacion?.fecha_acuerdo || "",
    fecha_notificacion: actuacion?.fecha_notificacion || "",
    resumen: actuacion?.resumen || "",
    foja: actuacion?.foja ?? "",
    termino_dias_otorgados: actuacion?.termino_dias_otorgados ?? "",
    termino_fecha_limite: actuacion?.termino_fecha_limite || "",
    documento_texto: actuacion?.documento_texto || "",
  });
  const [file, setFile] = useState(null);
  const [removeExistingPdf, setRemoveExistingPdf] = useState(false);
  const [fileError, setFileError] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  function set(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function handleFileChange(e) {
    const f = e.target.files?.[0];
    setFileError("");
    setFile(null);
    if (!f) return;
    if (f.type !== "application/pdf") {
      setFileError("Solo se admiten archivos PDF.");
      return;
    }
    if (f.size > MAX_MB * 1024 * 1024) {
      setFileError(`El archivo supera el límite de ${MAX_MB} MB.`);
      return;
    }
    setFile(f);
    setRemoveExistingPdf(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);

    // pdf_path: undefined = no tocar; null = quitar; string = nuevo archivo
    let pdf_path;
    if (file) {
      setUploading(true);
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${userId}/${expedienteId}/${Date.now()}_${safeName}`;
      const { error: uploadError } = await supabase.storage
        .from("acuerdos-pdf")
        .upload(path, file, { cacheControl: "3600", upsert: false });
      setUploading(false);
      if (uploadError) {
        setFileError(`No se pudo subir el PDF: ${uploadError.message}`);
        setSaving(false);
        return;
      }
      pdf_path = path;
    } else if (removeExistingPdf) {
      pdf_path = null;
    }

    const payload = {
      tipo: form.tipo,
      fecha_acuerdo: form.fecha_acuerdo,
      fecha_notificacion: form.fecha_notificacion || null,
      resumen: form.resumen,
      foja: Number(form.foja),
      termino_dias_otorgados: form.termino_dias_otorgados ? Number(form.termino_dias_otorgados) : null,
      termino_fecha_limite: form.termino_fecha_limite || null,
      documento_texto: form.documento_texto || null,
    };
    if (pdf_path !== undefined) payload.pdf_path = pdf_path;

    await onSubmit(payload, isEdit ? actuacion.id : undefined);
    setSaving(false);
  }

  const showingExistingPdf = isEdit && actuacion.pdf_path && !file && !removeExistingPdf;

  return (
    <div style={overlayStyle}>
      <form onSubmit={handleSubmit} className="ed-sans" style={modalStyle}>
        <div style={headerStyle}>
          <h3 className="ed-serif" style={{ margin: 0, fontSize: 16, color: T.ink }}>
            {isEdit ? "Editar actuación" : "Nueva actuación"}
          </h3>
          <button type="button" onClick={onClose} style={closeBtnStyle}><X size={16} /></button>
        </div>

        <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 12, maxHeight: "70vh", overflowY: "auto" }} className="ed-scroll">
          <Field label="Tipo de actuación">
            <select value={form.tipo} onChange={(e) => set("tipo", e.target.value)} style={inputStyle} required>
              {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>

          <div style={{ display: "flex", gap: 10 }}>
            <Field label="Fecha de acuerdo o promoción" style={{ flex: 1 }}>
              <input type="date" value={form.fecha_acuerdo} onChange={(e) => set("fecha_acuerdo", e.target.value)} style={inputStyle} required />
            </Field>
            <Field label="Fecha de presentación o de notificación" style={{ flex: 1 }}>
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

          <Field label="Texto del documento (opcional, respaldo si no subes PDF)">
            <textarea rows={4} value={form.documento_texto} onChange={(e) => set("documento_texto", e.target.value)} style={{ ...inputStyle, resize: "vertical" }} placeholder="Pega aquí el contenido del acuerdo. Usa líneas en blanco para separar párrafos." />
          </Field>
        </div>

        <div style={{ padding: "4px 20px 16px", borderTop: `1px solid ${T.line}`, paddingTop: 14 }}>
          {showingExistingPdf && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, fontSize: 12.5, color: T.inkSoft }}>
              <FileCheck size={15} color={T.green} />
              <span style={{ flex: 1 }}>Ya tiene un PDF cargado.</span>
              {existingPdfUrl && (
                <a href={existingPdfUrl} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 4, color: T.brass, fontWeight: 600, textDecoration: "none" }}>
                  Ver <ExternalLink size={12} />
                </a>
              )}
              <button type="button" onClick={() => setRemoveExistingPdf(true)} style={{ background: "none", border: "none", color: T.red, fontSize: 12, cursor: "pointer", textDecoration: "underline" }}>
                Quitar
              </button>
            </div>
          )}
          {removeExistingPdf && (
            <div style={{ fontSize: 12, color: T.red, marginBottom: 10 }}>
              Se quitará el PDF actual al guardar (puedes cargar uno nuevo abajo).
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <label htmlFor="pdf-upload" style={pdfButtonStyle}>
              {uploading ? "Subiendo…" : file ? "PDF listo para guardar" : "Cargar PDF del documento"}
            </label>
            <input id="pdf-upload" type="file" accept="application/pdf" onChange={handleFileChange} style={{ display: "none" }} />
            {file && <span style={{ fontSize: 12, color: T.ink, fontWeight: 600 }}>{file.name}</span>}
          </div>
          {fileError && (
            <div style={{ display: "flex", gap: 6, alignItems: "center", color: T.red, fontSize: 11.5, marginTop: 8 }}>
              <AlertCircle size={12} /> {fileError}
            </div>
          )}
          <p style={{ fontSize: 11, color: T.slateLight, margin: "8px 0 0" }}>
            Máx. 20 MB. Si subes un PDF, se mostrará ese documento real en el visor.
          </p>
        </div>

        <div style={footerStyle}>
          <button type="button" onClick={onClose} style={secondaryBtn}>Cancelar</button>
          <button type="submit" disabled={saving} style={primaryBtn}>
            {saving ? "Guardando…" : isEdit ? "Guardar cambios" : "Guardar actuación"}
          </button>
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
const pdfButtonStyle = { display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 16px", background: "#1F5A73", color: "#FFFFFF", border: "none", borderRadius: 4, fontSize: 12.5, fontWeight: 600, cursor: "pointer" };
