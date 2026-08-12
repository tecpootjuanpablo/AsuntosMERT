export const T = {
  ink: "#182338",
  inkSoft: "#3B4A63",
  slate: "#64708A",
  slateLight: "#98A2B8",
  paper: "#F3F1EA",
  paperPanel: "#FDFCF9",
  paperInk: "#FFFFFF",
  line: "#E2DED0",
  lineStrong: "#CFC9B6",
  brass: "#9C7A3C",
  brassSoft: "#EDE3CC",
  red: "#A93226",
  redBg: "#F8E7E4",
  redLine: "#E4B7AE",
  amber: "#B4780B",
  amberBg: "#FBF0DA",
  amberLine: "#E7C883",
  green: "#276B47",
  greenBg: "#E4EFE7",
  greenLine: "#B7D4C0",
};

export const FONT_STYLE = `
  @import url('https://fonts.googleapis.com/css2?family=Source+Serif+4:opsz,wght@8..60,400;8..60,500;8..60,600;8..60,700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
  * { box-sizing: border-box; }
  body { margin: 0; }
  .ed-serif { font-family: 'Source Serif 4', Georgia, serif; }
  .ed-sans { font-family: 'Inter', system-ui, sans-serif; }
  .ed-mono { font-family: 'JetBrains Mono', 'Courier New', monospace; }
  .ed-scroll::-webkit-scrollbar { width: 8px; height: 8px; }
  .ed-scroll::-webkit-scrollbar-track { background: transparent; }
  .ed-scroll::-webkit-scrollbar-thumb { background: ${T.lineStrong}; border-radius: 4px; }
  .ed-row:hover { background: #EFEBDD !important; }
  .ed-fade-in { animation: edFadeIn .25s ease; }
  @keyframes edFadeIn { from { opacity: 0; transform: translateY(3px);} to { opacity: 1; transform: translateY(0);} }
  @media (prefers-reduced-motion: reduce) { .ed-fade-in { animation: none; } }
  input, select, textarea { font-family: inherit; }
`;

export const TYPE_META = {
  Promoción: { fg: T.inkSoft, bg: "#E9E5D6" },
  Auto: { fg: T.brass, bg: T.brassSoft },
  Sentencia: { fg: T.red, bg: T.redBg },
  Audiencia: { fg: "#5B3E8E", bg: "#EAE3F4" },
  Notificación: { fg: T.slate, bg: "#E7E9EF" },
  Oficio: { fg: "#1F5A73", bg: "#DEEAF0" },
};

export const ESTADO_META = {
  vencido: { label: "PRECLUIDO", color: T.red, bg: T.redBg, line: T.redLine },
  por_vencer: { label: "POR VENCER", color: T.amber, bg: T.amberBg, line: T.amberLine },
  vigente: { label: "EN TÉRMINO", color: T.green, bg: T.greenBg, line: T.greenLine },
  sin_termino: { label: "SIN TÉRMINO", color: T.slateLight, bg: "#EEECE4", line: T.line },
};

export function formatFecha(iso) {
  if (!iso) return "—";
  const meses = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  const [y, m, d] = iso.split("-").map(Number);
  return `${String(d).padStart(2, "0")} ${meses[m - 1]} ${y}`;
}

// Calcula el estado del término en vivo, a partir de la fecha límite real.
// (así el semáforo siempre refleja "hoy", no un valor guardado que se vuelve viejo)
export function calcularTermino(diasOtorgados, fechaLimite) {
  if (!fechaLimite) return { estado: "sin_termino", diasOtorgados: null, diasRestantes: null, fechaLimite: null };
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const limite = new Date(fechaLimite + "T00:00:00");
  const diffMs = limite - hoy;
  const diasRestantes = Math.round(diffMs / (1000 * 60 * 60 * 24));

  let estado;
  if (diasRestantes < 0) estado = "vencido";
  else if (diasRestantes <= 5) estado = "por_vencer";
  else estado = "vigente";

  return { estado, diasOtorgados, diasRestantes, fechaLimite };
}
