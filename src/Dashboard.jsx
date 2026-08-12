import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  Filter, Plus, Download, ChevronRight, Scale, FileStack, FileText,
  Search, LogOut, ChevronDown, X, Pencil, Eye, FileArchive,
} from "lucide-react";
import JSZip from "jszip";
import { T } from "./theme.js";
import { supabase } from "./supabaseClient.js";
import { TerminoStamp, TypeTag, DocumentPage, useToast, Toast } from "./components/UI.jsx";
import { calcularTermino, formatFecha } from "./theme.js";
import ActuacionModal from "./components/NuevaActuacionModal.jsx";
import NuevoExpedienteModal from "./components/NuevoExpedienteModal.jsx";

export default function Dashboard({ session }) {
  const [socios, setSocios] = useState([]);
  const [expedientes, setExpedientes] = useState([]);
  const [actuaciones, setActuaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toastMsg, showToast] = useToast();

  const [filtroSocioId, setFiltroSocioId] = useState("todos");
  const [expedienteId, setExpedienteId] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [tab, setTab] = useState("actuacion");
  const [soloVencimientos, setSoloVencimientos] = useState(false);
  const [showNuevaActuacion, setShowNuevaActuacion] = useState(false);
  const [editingActuacion, setEditingActuacion] = useState(null); // objeto actuación o null
  const [showNuevoExpediente, setShowNuevoExpediente] = useState(false);
  const [expedientePickerOpen, setExpedientePickerOpen] = useState(false);
  const [pdfUrls, setPdfUrls] = useState({}); // { [actuacionId]: signedUrl }
  const [pdfLoadingIds, setPdfLoadingIds] = useState({});
  const [descargandoZip, setDescargandoZip] = useState(false);

  const misocio = socios.find((s) => s.id === session.user.id);

  const cargarTodo = useCallback(async () => {
    setLoading(true);
    const [{ data: sociosData }, { data: expData }] = await Promise.all([
      supabase.from("socios").select("*").order("nombre"),
      supabase.from("expedientes").select("*").order("created_at", { ascending: false }),
    ]);
    setSocios(sociosData || []);
    setExpedientes(expData || []);
    if (expData && expData.length && !expedienteId) {
      setExpedienteId(expData[0].id);
    }
    setLoading(false);
  }, [expedienteId]);

  useEffect(() => {
    cargarTodo();
  }, []); // eslint-disable-line

  useEffect(() => {
    if (!expedienteId) return;
    supabase
      .from("actuaciones")
      .select("*")
      .eq("expediente_id", expedienteId)
      .order("fecha_acuerdo", { ascending: true })
      .then(({ data }) => {
        setActuaciones(data || []);
        if (data && data.length) setSelectedId(data[data.length - 1].id);
        setTab("actuacion");
      });
  }, [expedienteId]);

  // Genera enlaces firmados y temporales (1 hora) para cada PDF real
  // subido a Storage. El bucket es privado: sin este paso nadie puede
  // ver el archivo, ni siquiera con el link directo.
  useEffect(() => {
    const conPdf = actuaciones.filter((a) => a.pdf_path && !pdfUrls[a.id]);
    if (conPdf.length === 0) return;
    setPdfLoadingIds((prev) => {
      const next = { ...prev };
      conPdf.forEach((a) => (next[a.id] = true));
      return next;
    });
    Promise.all(
      conPdf.map(async (a) => {
        const { data, error } = await supabase.storage.from("acuerdos-pdf").createSignedUrl(a.pdf_path, 3600);
        return { id: a.id, url: error ? null : data.signedUrl };
      })
    ).then((results) => {
      setPdfUrls((prev) => {
        const next = { ...prev };
        results.forEach((r) => (next[r.id] = r.url));
        return next;
      });
      setPdfLoadingIds((prev) => {
        const next = { ...prev };
        results.forEach((r) => (next[r.id] = false));
        return next;
      });
    });
  }, [actuaciones]); // eslint-disable-line

  const actuacionesConTermino = useMemo(
    () =>
      actuaciones.map((a) => ({
        ...a,
        termino: calcularTermino(a.termino_dias_otorgados, a.termino_fecha_limite),
      })),
    [actuaciones]
  );

  const esPendiente = (a) => !a.termino_atendido && (a.termino.estado === "vencido" || a.termino.estado === "por_vencer");

  const visibles = useMemo(() => {
    if (!soloVencimientos) return actuacionesConTermino;
    return actuacionesConTermino.filter(esPendiente);
  }, [actuacionesConTermino, soloVencimientos]);

  const alertCount = actuacionesConTermino.filter(esPendiente).length;

  const selected = actuacionesConTermino.find((a) => a.id === selectedId);

  const expedientesFiltrados = useMemo(() => {
    if (filtroSocioId === "todos") return expedientes;
    return expedientes.filter((e) => e.socio_id === filtroSocioId);
  }, [expedientes, filtroSocioId]);

  const expedienteActual = expedientes.find((e) => e.id === expedienteId);
  const socioDelExpediente = socios.find((s) => s.id === expedienteActual?.socio_id);
  const esDueñoDelExpediente = expedienteActual?.socio_id === session.user.id;

  async function recargarActuaciones(seleccionarUltima) {
    const { data } = await supabase
      .from("actuaciones")
      .select("*")
      .eq("expediente_id", expedienteId)
      .order("fecha_acuerdo", { ascending: true });
    setActuaciones(data || []);
    if (seleccionarUltima && data && data.length) setSelectedId(data[data.length - 1].id);
  }

  async function handleGuardarActuacion(payload, actuacionId) {
    if (actuacionId) {
      const { error } = await supabase.from("actuaciones").update(payload).eq("id", actuacionId);
      if (error) {
        showToast(`No se pudo guardar el cambio: ${error.message}`);
        return;
      }
      showToast("Actuación actualizada.");
      setEditingActuacion(null);
      setPdfUrls((prev) => {
        const next = { ...prev };
        delete next[actuacionId]; // fuerza regenerar el link firmado si el PDF cambió
        return next;
      });
      await recargarActuaciones(false);
    } else {
      const { error } = await supabase.from("actuaciones").insert({ ...payload, expediente_id: expedienteId });
      if (error) {
        showToast(`No se pudo guardar: ${error.message}`);
        return;
      }
      showToast("Actuación agregada al expediente.");
      setShowNuevaActuacion(false);
      await recargarActuaciones(true);
    }
  }

  async function handleNuevoExpediente(payload) {
    const { data, error } = await supabase
      .from("expedientes")
      .insert({ ...payload, socio_id: session.user.id })
      .select()
      .single();
    if (error) {
      showToast(`No se pudo crear el expediente: ${error.message}`);
      return;
    }
    showToast("Expediente creado.");
    setShowNuevoExpediente(false);
    await cargarTodo();
    setExpedienteId(data.id);
  }

  async function handleToggleAtendido(actuacion) {
    const nuevoValor = !actuacion.termino_atendido;
    setActuaciones((prev) => prev.map((a) => (a.id === actuacion.id ? { ...a, termino_atendido: nuevoValor } : a)));
    const { error } = await supabase.from("actuaciones").update({ termino_atendido: nuevoValor }).eq("id", actuacion.id);
    if (error) {
      setActuaciones((prev) => prev.map((a) => (a.id === actuacion.id ? { ...a, termino_atendido: !nuevoValor } : a)));
      showToast(`No se pudo actualizar: ${error.message}`);
      return;
    }
    showToast(nuevoValor ? "Término marcado como atendido." : "Se quitó la marca de atendido.");
  }

  async function handleDescargarExpedienteCompleto() {
    const conPdf = [...actuaciones]
      .filter((a) => a.pdf_path)
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at)); // cronológico, como se subieron

    if (conPdf.length === 0) {
      showToast("Este expediente todavía no tiene PDFs cargados.");
      return;
    }

    showToast(`Preparando ${conPdf.length} documento(s) en un archivo .zip…`);
    setDescargandoZip(true);
    try {
      const zip = new JSZip();
      for (let i = 0; i < conPdf.length; i++) {
        const a = conPdf[i];
        const { data, error } = await supabase.storage.from("acuerdos-pdf").download(a.pdf_path);
        if (error || !data) continue;
        const numero = String(i + 1).padStart(2, "0");
        const nombre = `${numero} - ${a.tipo} - foja ${String(a.foja).padStart(3, "0")} - ${a.fecha_acuerdo}.pdf`;
        zip.file(nombre, data);
      }
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `expediente-${expedienteActual.numero.replace(/[\/\\]/g, "-")}-completo.zip`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      showToast("Descarga lista.");
    } catch (err) {
      showToast(`No se pudo generar el archivo: ${err.message}`);
    } finally {
      setDescargandoZip(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  if (loading) {
    return (
      <div className="ed-sans" style={{ minHeight: "100vh", background: T.paper, display: "flex", alignItems: "center", justifyContent: "center", color: T.slate, fontSize: 13 }}>
        Cargando expedientes…
      </div>
    );
  }

  if (!expedienteActual) {
    return (
      <EmptyState
        socio={misocio}
        onNuevoExpediente={() => setShowNuevoExpediente(true)}
        onLogout={handleLogout}
        modal={
          showNuevoExpediente && (
            <NuevoExpedienteModal onClose={() => setShowNuevoExpediente(false)} onSubmit={handleNuevoExpediente} />
          )
        }
      />
    );
  }

  return (
    <div className="ed-sans" style={{ background: T.paper, minHeight: "100vh", color: T.ink, display: "flex", flexDirection: "column" }}>
      <Toast msg={toastMsg} />
      {showNuevaActuacion && (
        <ActuacionModal
          onClose={() => setShowNuevaActuacion(false)}
          onSubmit={handleGuardarActuacion}
          expedienteId={expedienteId}
          userId={session.user.id}
        />
      )}
      {editingActuacion && (
        <ActuacionModal
          onClose={() => setEditingActuacion(null)}
          onSubmit={handleGuardarActuacion}
          expedienteId={expedienteId}
          userId={session.user.id}
          actuacion={editingActuacion}
          existingPdfUrl={pdfUrls[editingActuacion.id]}
        />
      )}
      {showNuevoExpediente && (
        <NuevoExpedienteModal onClose={() => setShowNuevoExpediente(false)} onSubmit={handleNuevoExpediente} />
      )}

      {/* ===== HEADER / CARÁTULA ===== */}
      <header style={{ background: T.ink, color: T.paperPanel, borderBottom: `3px solid ${T.brass}`, padding: "14px 24px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: "50%", border: `1.5px solid ${T.brass}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Scale size={18} color={T.brass} strokeWidth={1.8} />
            </div>
            <div style={{ position: "relative" }}>
              <button
                onClick={() => setExpedientePickerOpen((v) => !v)}
                className="ed-sans"
                style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "inherit", cursor: "pointer", padding: 0, textAlign: "left" }}
              >
                <div>
                  <div className="ed-mono" style={{ fontSize: 11, letterSpacing: "0.08em", color: T.brass, textTransform: "uppercase" }}>
                    Expediente N° {expedienteActual.numero}
                  </div>
                  <h1 className="ed-serif" style={{ fontSize: 19, fontWeight: 600, margin: 0, lineHeight: 1.2, display: "flex", alignItems: "center", gap: 6 }}>
                    {expedienteActual.materia}
                    <ChevronDown size={15} color="#B7BFCF" />
                  </h1>
                </div>
              </button>
              <div style={{ fontSize: 12.5, color: "#B7BFCF", marginTop: 2 }}>
                {expedienteActual.juzgado} · a cargo de {socioDelExpediente?.nombre || "—"}
              </div>

              {expedientePickerOpen && (
                <ExpedientePicker
                  expedientes={expedientesFiltrados}
                  socios={socios}
                  activeId={expedienteId}
                  onSelect={(id) => {
                    setExpedienteId(id);
                    setExpedientePickerOpen(false);
                  }}
                  onNuevo={() => {
                    setExpedientePickerOpen(false);
                    setShowNuevoExpediente(true);
                  }}
                  filtroSocioId={filtroSocioId}
                  setFiltroSocioId={setFiltroSocioId}
                />
              )}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 22, fontSize: 12.5, flexWrap: "wrap" }}>
            <div>
              <div style={{ color: "#8992A6", fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.05em" }}>Actor</div>
              <div style={{ fontWeight: 500 }}>{expedienteActual.actor}</div>
            </div>
            <div>
              <div style={{ color: "#8992A6", fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.05em" }}>Demandado</div>
              <div style={{ fontWeight: 500 }}>{expedienteActual.demandado}</div>
            </div>
            <div style={{ borderLeft: "1px solid #3B4A63", paddingLeft: 16, display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontWeight: 500, fontSize: 12.5 }}>{misocio?.nombre || session.user.email}</div>
                <div style={{ fontSize: 10.5, color: "#8992A6" }}>{session.user.email}</div>
              </div>
              <button
                onClick={handleLogout}
                title="Cerrar sesión"
                style={{ background: "none", border: `1px solid #3B4A63`, borderRadius: 4, color: "#B7BFCF", padding: 7, cursor: "pointer", display: "flex" }}
              >
                <LogOut size={13} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ===== SPLIT VIEW ===== */}
      <div style={{ display: "flex", flex: 1, minHeight: 0, gap: 1, background: T.line }}>
        {/* ---------- IZQUIERDA: ÍNDICE ---------- */}
        <div style={{ width: "42%", minWidth: 380, background: T.paperPanel, display: "flex", flexDirection: "column", minHeight: 0 }}>
          <div style={{ padding: "14px 16px 12px", borderBottom: `1px solid ${T.line}` }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <h2 className="ed-serif" style={{ fontSize: 15, fontWeight: 600, margin: 0, color: T.ink }}>
                Índice de Actuaciones
              </h2>
              <span className="ed-mono" style={{ fontSize: 11, color: T.slate, background: T.paper, border: `1px solid ${T.line}`, borderRadius: 3, padding: "2px 7px" }}>
                {visibles.length} de {actuaciones.length}
              </span>
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                onClick={() => setSoloVencimientos((v) => !v)}
                style={pillStyle(soloVencimientos ? T.red : T.line, soloVencimientos ? T.redBg : T.paperPanel, soloVencimientos ? T.red : T.inkSoft)}
              >
                <Filter size={13} />
                Vencimientos
                {alertCount > 0 && (
                  <span style={{ background: soloVencimientos ? T.red : T.slateLight, color: "white", borderRadius: 9, fontSize: 10, minWidth: 16, height: 16, display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "0 4px" }}>
                    {alertCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => setShowNuevaActuacion(true)}
                style={{ ...pillStyle(T.ink, T.ink, T.paperPanel), opacity: esDueñoDelExpediente ? 1 : 0.45, cursor: esDueñoDelExpediente ? "pointer" : "not-allowed" }}
                disabled={!esDueñoDelExpediente}
                title={!esDueñoDelExpediente ? "Solo el socio responsable puede agregar actuaciones a este expediente." : undefined}
              >
                <Plus size={13} />
                Nueva actuación
              </button>

              <button onClick={handleDescargarExpedienteCompleto} disabled={descargandoZip} style={{ ...pillStyle(T.line, T.paperPanel, T.inkSoft), opacity: descargandoZip ? 0.6 : 1 }}>
                <Download size={13} />
                {descargandoZip ? "Preparando…" : "Descargar"}
              </button>
            </div>
          </div>

          <div className="ed-scroll" style={{ flex: 1, overflowY: "auto", padding: "10px 12px" }}>
            {visibles.length === 0 && (
              <div style={{ textAlign: "center", padding: "40px 20px", color: T.slate, fontSize: 13 }}>
                {actuaciones.length === 0
                  ? "Este expediente aún no tiene actuaciones capturadas."
                  : "No hay actuaciones con vencimientos activos."}
              </div>
            )}
            {visibles.map((a) => {
              const isSelected = a.id === selectedId;
              return (
                <div
                  key={a.id}
                  className="ed-row"
                  style={{
                    display: "flex", gap: 12, width: "100%", padding: "12px 12px", marginBottom: 8,
                    borderRadius: 6, border: `1px solid ${isSelected ? T.brass : T.line}`,
                    background: isSelected ? "#FBF6EA" : T.paperPanel,
                    boxShadow: isSelected ? "0 1px 0 rgba(156,122,60,0.15)" : "none",
                    position: "relative",
                  }}
                >
                  <TerminoStamp
                    termino={a.termino}
                    compact
                    atendido={a.termino_atendido}
                    canToggle={esDueñoDelExpediente}
                    onToggleAtendido={() => handleToggleAtendido(a)}
                  />

                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      setSelectedId(a.id);
                      setTab("actuacion");
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        setSelectedId(a.id);
                        setTab("actuacion");
                      }
                    }}
                    style={{ flex: 1, minWidth: 0, textAlign: "left", cursor: "pointer" }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5, flexWrap: "wrap" }}>
                      <TypeTag tipo={a.tipo} />
                      <span className="ed-mono" style={{ fontSize: 10.5, color: T.slate }}>foja {a.foja}</span>
                    </div>
                    <p className="ed-serif" style={{ fontSize: 13, lineHeight: 1.45, color: T.ink, margin: "0 0 7px", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                      {a.resumen}
                    </p>
                    <div style={{ display: "flex", gap: 14, fontSize: 10.5, color: T.slate, flexWrap: "wrap" }}>
                      <span><strong style={{ color: T.inkSoft, fontWeight: 600 }}>Acuerdo:</strong> <span className="ed-mono">{formatFecha(a.fecha_acuerdo)}</span></span>
                      <span><strong style={{ color: T.inkSoft, fontWeight: 600 }}>Notificación:</strong> <span className="ed-mono">{formatFecha(a.fecha_notificacion)}</span></span>
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, flexShrink: 0 }}>
                    {a.pdf_path && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (pdfUrls[a.id]) window.open(pdfUrls[a.id], "_blank", "noopener");
                        }}
                        title="Ver PDF"
                        style={{
                          display: "inline-flex", alignItems: "center", gap: 4, background: "#1F5A73", color: "#FFFFFF",
                          border: "none", borderRadius: 4, padding: "4px 8px", fontSize: 10.5, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
                        }}
                      >
                        <Eye size={11} /> Ver PDF
                      </button>
                    )}
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      {esDueñoDelExpediente && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingActuacion(a);
                          }}
                          title="Editar actuación"
                          style={{ background: "none", border: `1px solid ${T.line}`, borderRadius: 4, padding: 5, color: T.slate, cursor: "pointer", display: "flex" }}
                        >
                          <Pencil size={12} />
                        </button>
                      )}
                      <ChevronRight size={16} color={isSelected ? T.brass : T.slateLight} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ---------- DERECHA: VISOR ---------- */}
        <div style={{ flex: 1, background: T.paperPanel, display: "flex", flexDirection: "column", minHeight: 0 }}>
          <div style={{ display: "flex", borderBottom: `1px solid ${T.line}`, background: T.paper }}>
            <TabButton active={tab === "actuacion"} onClick={() => setTab("actuacion")} icon={<FileText size={14} />} label="Actuación Específica" />
            <TabButton active={tab === "completo"} onClick={() => setTab("completo")} icon={<FileStack size={14} />} label="Expediente Completo" />
            <div style={{ flex: 1 }} />
            <button
              onClick={handleDescargarExpedienteCompleto}
              disabled={descargandoZip}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6, margin: "8px 12px", padding: "8px 14px",
                background: "#1F5A73", color: "#FFFFFF", border: "none", borderRadius: 4, fontSize: 12.5, fontWeight: 600,
                cursor: descargandoZip ? "default" : "pointer", opacity: descargandoZip ? 0.6 : 1, whiteSpace: "nowrap",
              }}
            >
              <FileArchive size={14} />
              {descargandoZip ? "Preparando…" : "Ver expediente completo en PDF"}
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 16px", color: T.slate, fontSize: 11.5 }}>
              <Search size={13} />
              {tab === "actuacion" && selected ? `foja ${selected.foja}` : `${expedienteActual.fojas_totales} fojas`}
            </div>
          </div>

          <div className="ed-scroll" style={{ flex: 1, overflowY: "auto", background: "#E9E5D8", padding: "28px 32px" }}>
            {actuaciones.length === 0 ? (
              <div style={{ textAlign: "center", color: T.slate, fontSize: 13, marginTop: 60 }}>
                Agrega la primera actuación con el botón "Nueva actuación".
              </div>
            ) : tab === "actuacion" && selected ? (
              <DocumentPage
                key={selected.id}
                foja={selected.foja}
                tipo={selected.tipo}
                fecha={selected.fecha_acuerdo}
                texto={selected.documento_texto}
                pdfPath={selected.pdf_path}
                pdfUrl={pdfUrls[selected.id]}
                pdfLoading={!!pdfLoadingIds[selected.id]}
              />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                {actuacionesConTermino.map((a) => (
                  <DocumentPage
                    key={a.id}
                    foja={a.foja}
                    tipo={a.tipo}
                    fecha={a.fecha_acuerdo}
                    texto={a.documento_texto}
                    pdfPath={a.pdf_path}
                    pdfUrl={pdfUrls[a.id]}
                    pdfLoading={!!pdfLoadingIds[a.id]}
                    highlighted={a.id === selectedId}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function pillStyle(borderColor, bg, color) {
  return {
    display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 500,
    padding: "7px 12px", borderRadius: 4, border: `1px solid ${borderColor}`, background: bg, color, cursor: "pointer",
  };
}

function TabButton({ active, onClick, icon, label }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "inline-flex", alignItems: "center", gap: 7, padding: "12px 18px", fontSize: 13, fontWeight: 600,
        color: active ? T.ink : T.slate, background: active ? T.paperPanel : "transparent", border: "none",
        borderBottom: `2px solid ${active ? T.brass : "transparent"}`, cursor: "pointer",
      }}
    >
      {icon}
      {label}
    </button>
  );
}

function ExpedientePicker({ expedientes, socios, activeId, onSelect, onNuevo, filtroSocioId, setFiltroSocioId }) {
  return (
    <div
      className="ed-fade-in ed-sans"
      style={{
        position: "absolute", top: "calc(100% + 10px)", left: 0, background: T.paperPanel, color: T.ink,
        border: `1px solid ${T.line}`, borderRadius: 6, width: 360, boxShadow: "0 10px 30px rgba(0,0,0,0.25)", zIndex: 40, overflow: "hidden",
      }}
    >
      <div style={{ padding: "10px 12px", borderBottom: `1px solid ${T.line}`, display: "flex", alignItems: "center", gap: 8 }}>
        <Filter size={13} color={T.slate} />
        <select
          value={filtroSocioId}
          onChange={(e) => setFiltroSocioId(e.target.value)}
          style={{ flex: 1, fontSize: 12.5, border: `1px solid ${T.line}`, borderRadius: 4, padding: "5px 6px", color: T.inkSoft, background: T.paper }}
        >
          <option value="todos">Todos los socios</option>
          {socios.map((s) => (
            <option key={s.id} value={s.id}>{s.nombre}</option>
          ))}
        </select>
      </div>
      <div className="ed-scroll" style={{ maxHeight: 280, overflowY: "auto" }}>
        {expedientes.length === 0 && (
          <div style={{ padding: 16, fontSize: 12.5, color: T.slate, textAlign: "center" }}>Sin expedientes para este filtro.</div>
        )}
        {expedientes.map((e) => {
          const s = socios.find((s) => s.id === e.socio_id);
          return (
            <button
              key={e.id}
              onClick={() => onSelect(e.id)}
              style={{
                display: "block", width: "100%", textAlign: "left", padding: "10px 12px", border: "none",
                borderBottom: `1px solid ${T.line}`, background: e.id === activeId ? "#FBF6EA" : "transparent", cursor: "pointer",
              }}
            >
              <div style={{ fontSize: 12.5, fontWeight: 600, color: T.ink }}>{e.numero} — {e.materia}</div>
              <div style={{ fontSize: 11, color: T.slate }}>{s?.nombre || "—"}</div>
            </button>
          );
        })}
      </div>
      <button
        onClick={onNuevo}
        style={{ display: "flex", alignItems: "center", gap: 6, width: "100%", padding: "10px 12px", border: "none", background: T.brassSoft, color: T.brass, fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}
      >
        <Plus size={13} /> Nuevo expediente
      </button>
    </div>
  );
}

function EmptyState({ socio, onNuevoExpediente, onLogout, modal }) {
  return (
    <div className="ed-sans" style={{ minHeight: "100vh", background: T.paper, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 14, padding: 20 }}>
      {modal}
      <Scale size={28} color={T.brass} />
      <h1 className="ed-serif" style={{ fontSize: 19, color: T.ink, margin: 0 }}>Aún no hay expedientes</h1>
      <p style={{ fontSize: 13, color: T.slate, margin: 0, textAlign: "center", maxWidth: 340 }}>
        {socio ? `Hola, ${socio.nombre}. ` : ""}Da de alta el primer expediente del despacho para empezar a capturar actuaciones.
      </p>
      <button onClick={onNuevoExpediente} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: T.ink, color: T.paperPanel, border: "none", borderRadius: 4, padding: "9px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
        <Plus size={14} /> Nuevo expediente
      </button>
      <button onClick={onLogout} style={{ background: "none", border: "none", color: T.slate, fontSize: 12, cursor: "pointer", textDecoration: "underline" }}>
        Cerrar sesión
      </button>
    </div>
  );
}


