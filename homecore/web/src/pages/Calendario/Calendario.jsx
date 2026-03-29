import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getEventos, crearEvento, actualizarEvento, eliminarEvento, getCategorias, crearCategoria } from "../../api/calendario";
import styles from "./Calendario.module.css";

const DIAS_SEMANA = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

function diasDelMes(anio, mes) {
  const primero = new Date(anio, mes - 1, 1);
  const ultimo  = new Date(anio, mes, 0).getDate();
  const offsetInicio = (primero.getDay() + 6) % 7;
  return { offsetInicio, totalDias: ultimo };
}

function formatoFecha(fechaStr) {
  if (!fechaStr) return "";
  const [y, m, d] = fechaStr.split("-");
  return `${d}/${m}/${y}`;
}

const FORM_VACIO = { titulo: "", fecha: "", fecha_fin: "", hora: "", descripcion: "", categoria_id: "" };

export default function Calendario() {
  const navigate  = useNavigate();
  const hoy       = new Date();
  const [mes, setMes]   = useState(hoy.getMonth() + 1);
  const [anio, setAnio] = useState(hoy.getFullYear());

  const [eventos,      setEventos]      = useState([]);
  const [categorias,   setCategorias]   = useState([]);
  const [diaSelec,     setDiaSelec]     = useState(null);
  const [mostrarForm,  setMostrarForm]  = useState(false);
  const [mostrarCats,  setMostrarCats]  = useState(false);
  const [eventoEditar, setEventoEditar] = useState(null);
  const [error,        setError]        = useState(null);

  const [form,     setForm]     = useState(FORM_VACIO);
  const [nuevaCat, setNuevaCat] = useState({ nombre: "", color: "#6366f1" });

  const cargar = () => {
    getEventos(mes, anio).then(d => setEventos(d.datos));
    getCategorias().then(d => setCategorias(d.datos));
  };

  useEffect(() => { cargar(); }, [mes, anio]);

  useEffect(() => {
    const id = setInterval(cargar, 30000);
    return () => clearInterval(id);
  }, [mes, anio]);

  // Mapea cada día del mes a sus eventos (incluyendo eventos de varios días)
  const eventosPorDia = {};
  eventos.forEach(e => {
    const [ay, am, ad] = e.fecha.split("-").map(Number);
    const finStr = e.fecha_fin || e.fecha;
    const [fy, fm, fd] = finStr.split("-").map(Number);
    const inicio = new Date(ay, am - 1, ad);
    const fin    = new Date(fy, fm - 1, fd);
    let cur = new Date(inicio);
    while (cur <= fin) {
      if (cur.getMonth() + 1 === mes && cur.getFullYear() === anio) {
        const dia = cur.getDate();
        if (!eventosPorDia[dia]) eventosPorDia[dia] = [];
        if (!eventosPorDia[dia].find(ev => ev.id === e.id)) eventosPorDia[dia].push(e);
      }
      cur.setDate(cur.getDate() + 1);
    }
  });

  const { offsetInicio, totalDias } = diasDelMes(anio, mes);

  const mesAnterior = () => {
    if (mes === 1) { setMes(12); setAnio(a => a - 1); }
    else setMes(m => m - 1);
    setDiaSelec(null);
  };
  const mesSiguiente = () => {
    if (mes === 12) { setMes(1); setAnio(a => a + 1); }
    else setMes(m => m + 1);
    setDiaSelec(null);
  };

  const abrirFormNuevo = (dia) => {
    const fecha = `${anio}-${String(mes).padStart(2,"0")}-${String(dia).padStart(2,"0")}`;
    setForm({ ...FORM_VACIO, fecha, categoria_id: categorias[0]?.id ?? "" });
    setEventoEditar(null);
    setError(null);
    setMostrarForm(true);
  };

  const abrirFormEditar = (e) => {
    setForm({
      titulo:       e.titulo,
      fecha:        e.fecha,
      fecha_fin:    e.fecha_fin || "",
      hora:         e.hora || "",
      descripcion:  e.descripcion || "",
      categoria_id: e.categoria_id ?? "",
    });
    setEventoEditar(e);
    setError(null);
    setMostrarForm(true);
  };

  const guardarEvento = async (e) => {
    e.preventDefault();
    setError(null);
    const payload = { ...form, categoria_id: form.categoria_id || null, fecha_fin: form.fecha_fin || null };
    try {
      if (eventoEditar) {
        await actualizarEvento(eventoEditar.id, payload);
      } else {
        await crearEvento(payload);
      }
      setMostrarForm(false);
      cargar();
    } catch (err) {
      setError(err.message);
    }
  };

  const borrarEvento = async (id) => {
    await eliminarEvento(id);
    cargar();
  };

  const guardarCategoria = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      await crearCategoria(nuevaCat);
      setNuevaCat({ nombre: "", color: "#6366f1" });
      getCategorias().then(d => setCategorias(d.datos));
    } catch (err) {
      setError(err.message);
    }
  };

  const eventosDelDia = diaSelec ? (eventosPorDia[diaSelec] || []) : [];

  return (
    <div className={styles.pagina}>
      <button className={styles.btnVolver} onClick={() => navigate("/")}>← Volver</button>

      <div className={styles.cabecera}>
        <h1 className={styles.titulo}>Calendario</h1>
        <button className={styles.btnSecundario} onClick={() => setMostrarCats(v => !v)}>
          {mostrarCats ? "Ocultar categorías" : "Gestionar categorías"}
        </button>
      </div>

      {mostrarCats && (
        <div className={styles.panelCats}>
          <div className={styles.listaCats}>
            {categorias.map(c => (
              <span key={c.id} className={styles.chip} style={{ background: c.color }}>
                {c.nombre}
              </span>
            ))}
          </div>
          <form className={styles.formCat} onSubmit={guardarCategoria}>
            <input
              placeholder="Nueva categoría"
              value={nuevaCat.nombre}
              onChange={e => setNuevaCat(p => ({ ...p, nombre: e.target.value }))}
              required
            />
            <input
              type="color"
              value={nuevaCat.color}
              onChange={e => setNuevaCat(p => ({ ...p, color: e.target.value }))}
              className={styles.inputColor}
            />
            <button type="submit" className={styles.btnPrimario}>Añadir</button>
          </form>
        </div>
      )}

      <div className={styles.nav}>
        <button className={styles.btnNav} onClick={mesAnterior}>‹</button>
        <span className={styles.mesActual}>{MESES[mes - 1]} {anio}</span>
        <button className={styles.btnNav} onClick={mesSiguiente}>›</button>
      </div>

      <div className={styles.grid}>
        {DIAS_SEMANA.map(d => (
          <div key={d} className={styles.cabDia}>{d}</div>
        ))}
        {Array.from({ length: offsetInicio }).map((_, i) => (
          <div key={`v-${i}`} className={styles.celdaVacia} />
        ))}
        {Array.from({ length: totalDias }, (_, i) => i + 1).map(dia => {
          const esHoy = dia === hoy.getDate() && mes === hoy.getMonth() + 1 && anio === hoy.getFullYear();
          const evs   = eventosPorDia[dia] || [];
          const selec = diaSelec === dia;
          return (
            <div
              key={dia}
              className={`${styles.celda} ${esHoy ? styles.hoy : ""} ${selec ? styles.seleccionado : ""}`}
              onClick={() => setDiaSelec(selec ? null : dia)}
            >
              <span className={styles.numDia}>{dia}</span>
              <div className={styles.puntos}>
                {evs.slice(0, 3).map(e => (
                  <span key={e.id} className={styles.punto} style={{ background: e.categoria_color || "#6366f1" }} />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {diaSelec && (
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <span className={styles.panelTitulo}>{diaSelec} de {MESES[mes - 1]}</span>
            <button className={styles.btnPrimario} onClick={() => abrirFormNuevo(diaSelec)}>+ Añadir</button>
          </div>

          {eventosDelDia.length === 0
            ? <p className={styles.vacio}>Sin eventos este día.</p>
            : eventosDelDia.map(e => (
              <div key={e.id} className={styles.evento}>
                <span className={styles.eventoDot} style={{ background: e.categoria_color || "#6366f1" }} />
                <div className={styles.eventoInfo}>
                  <span className={styles.eventoTitulo}>{e.titulo}</span>
                  {e.fecha_fin && e.fecha_fin !== e.fecha && (
                    <span className={styles.eventoHora}>{formatoFecha(e.fecha)} – {formatoFecha(e.fecha_fin)}</span>
                  )}
                  {e.hora && <span className={styles.eventoHora}>{e.hora}</span>}
                  {e.descripcion && <span className={styles.eventoDesc}>{e.descripcion}</span>}
                  <span className={styles.eventoMeta}>{e.categoria_nombre} · {e.creado_por}</span>
                </div>
                <button className={styles.btnEditar} onClick={() => abrirFormEditar(e)} title="Editar">✏</button>
                <button className={styles.btnBorrar} onClick={() => borrarEvento(e.id)}>✕</button>
              </div>
            ))
          }
        </div>
      )}

      {mostrarForm && (
        <div className={styles.overlay} onClick={() => setMostrarForm(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h2 className={styles.modalTitulo}>{eventoEditar ? "Editar evento" : "Nuevo evento"}</h2>
            <form className={styles.formEvento} onSubmit={guardarEvento}>
              <div className={styles.campo}>
                <label>Título</label>
                <input value={form.titulo} onChange={e => setForm(p => ({ ...p, titulo: e.target.value }))} required />
              </div>
              <div className={styles.campoFila}>
                <div className={styles.campo}>
                  <label>Fecha inicio</label>
                  <input type="date" value={form.fecha} onChange={e => setForm(p => ({ ...p, fecha: e.target.value }))} required />
                </div>
                <div className={styles.campo}>
                  <label>Fecha fin (opcional)</label>
                  <input type="date" value={form.fecha_fin} min={form.fecha} onChange={e => setForm(p => ({ ...p, fecha_fin: e.target.value }))} />
                </div>
              </div>
              <div className={styles.campo}>
                <label>Hora (opcional)</label>
                <input type="time" value={form.hora} onChange={e => setForm(p => ({ ...p, hora: e.target.value }))} />
              </div>
              <div className={styles.campo}>
                <label>Categoría</label>
                <select value={form.categoria_id} onChange={e => setForm(p => ({ ...p, categoria_id: e.target.value }))} className={styles.select}>
                  <option value="">Sin categoría</option>
                  {categorias.map(c => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
              </div>
              <div className={styles.campo}>
                <label>Descripción (opcional)</label>
                <textarea value={form.descripcion} onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))} rows={2} />
              </div>
              {error && <p className={styles.error}>{error}</p>}
              <div className={styles.modalAcciones}>
                <button type="button" className={styles.btnSecundario} onClick={() => setMostrarForm(false)}>Cancelar</button>
                <button type="submit" className={styles.btnPrimario}>{eventoEditar ? "Guardar cambios" : "Guardar"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
