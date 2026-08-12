import React from "react";
import { AlertTriangle, Clock, CheckCircle2, MinusCircle } from "lucide-react";
import { T, TYPE_META, ESTADO_META, formatFecha } from "../theme.js";

const ESTADO_ICON = {
  vencido: AlertTriangle,
  por_vencer: Clock,
  vigente: CheckCircle2,
  sin_termino: MinusCircle,
};

export function TerminoStamp({ termino, compact }) {
  const meta = ESTADO_META[termino.estado];
  const Icon = ESTADO_ICON[termino.estado];
  let sub = null;
  if (termino.estado === "vencido") sub = `venció`;
  if (termino.estado === "por_vencer") sub = `${termino.diasRestantes}d`;
  if (termino.estado === "vigente") sub = `${termino.diasRestantes}d`;

  return (
    <div
      className="ed-sans"
      title={
        termino.estado === "vencido"
          ? `Venció ${formatFecha(termino.fechaLimite)}`
          : termino.estado === "sin_termino"
          ? "Sin término procesal"
          : `${termino.diasRestantes} días restantes (límite ${formatFecha(termino.fechaLimite)})`
      }
      style={{
        display: "inline-flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 1,
        border: `1.5px solid ${meta.line}`,
        outline: `1px solid ${meta.bg}`,
        outlineOffset: 2,
        background: meta.bg,
        color: meta.color,
        borderRadius: "50%",
        width: compact ? 56 : 68,
        height: compact ? 56 : 68,
        transform: "rotate(-3deg)",
        flexShrink: 0,
      }}
    >
      <Icon size={compact ? 14 : 16} strokeWidth={2.4} />
      <span style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: "0.02em", lineHeight: 1, textAlign: "center" }}>
        {meta.label}
      </span>
      {sub && (
        <span style={{ fontSize: 7, fontWeight: 500, opacity: 0.85, lineHeight: 1 }}>{sub}</span>
      )}
    </div>
  );
}

export function TypeTag({ tipo }) {
  const meta = TYPE_META[tipo] || TYPE_META.Promoción;
  return (
    <span
      className="ed-sans"
      style={{
        display: "inline-block",
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.03em",
        textTransform: "uppercase",
        color: meta.fg,
        background: meta.bg,
        padding: "3px 9px",
        borderRadius: 3,
      }}
    >
      {tipo}
    </span>
  );
}

export function DocumentPage({ foja, tipo, fecha, texto, highlighted }) {
  const lines = (texto || "Sin contenido capturado para esta actuación.").split("\n");
  return (
    <div
      className="ed-fade-in"
      style={{
        background: T.paperInk,
        maxWidth: 640,
        margin: "0 auto",
        padding: "36px 44px 44px",
        boxShadow: highlighted
          ? `0 2px 14px rgba(156,122,60,0.35), 0 0 0 2px ${T.brass}`
          : "0 1px 6px rgba(24,35,56,0.12)",
        position: "relative",
        minHeight: 480,
      }}
    >
      <div
        className="ed-mono"
        style={{ position: "absolute", top: 14, right: 18, fontSize: 10, color: T.slateLight, letterSpacing: "0.04em" }}
      >
        FOJA {String(foja).padStart(3, "0")}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
        <TypeTag tipo={tipo} />
        <span className="ed-mono" style={{ fontSize: 11, color: T.slate }}>
          {formatFecha(fecha)}
        </span>
      </div>

      <div className="ed-serif" style={{ fontSize: 14, lineHeight: 1.85, color: "#242E3F" }}>
        {lines.map((line, i) =>
          line.trim() === "" ? (
            <div key={i} style={{ height: 12 }} />
          ) : (
            <p key={i} style={{ margin: 0 }}>
              {line}
            </p>
          )
        )}
      </div>
    </div>
  );
}

export function useToast() {
  const [msg, setMsg] = React.useState(null);
  const timer = React.useRef(null);
  const show = (text) => {
    setMsg(text);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setMsg(null), 2800);
  };
  React.useEffect(() => () => clearTimeout(timer.current), []);
  return [msg, show];
}

export function Toast({ msg }) {
  if (!msg) return null;
  return (
    <div
      className="ed-fade-in ed-sans"
      style={{
        position: "fixed",
        top: 16,
        right: 16,
        zIndex: 60,
        background: T.ink,
        color: T.paperPanel,
        padding: "10px 16px",
        borderRadius: 4,
        borderLeft: `3px solid ${T.brass}`,
        fontSize: 13,
        boxShadow: "0 6px 20px rgba(0,0,0,0.25)",
        maxWidth: 320,
      }}
    >
      {msg}
    </div>
  );
}
