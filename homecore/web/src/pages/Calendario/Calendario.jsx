import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getEventos, crearEvento, eliminarEvento, getCategorias, crearCategoria } from "../../api/calendario";
import styles from "./Calendario.module.css";

const DIAS_SEMANA = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

function diasDelMes(anio, mes) {
  const primero = new Date(anio, mes - 1, 1);
  const ultimo  = new Date(anio, mes, 0).getDate();
  // lunes=0 ... domingo=6
  const offsetInicio = (primero.getDay() + 6) % 7;
  return { offsetInicio, totalDias: ultimo };
}

export default function Calendario() {
  const navigate  = useNavigate();
  const hoy       = new Date();
  const [mes, setMes]   = useState(hoy.getMonth() + 1);
  const [anio, setAnio] = useState(hoy.getFullYear());

  const [eventos,     setEventos]     = useState([]);
  const [categorias,  setCategorias]  = useState([]);
  const [diaSelec,    setDiaSelec]    = useState(null);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [mostrarCats, setMostrarCats] = useState(false);
  const [error,       setError]       = useState(null);

  const [form, setForm] = useState({ titulo: "", fecha: "", hora: "", descripcion: "", categoria_id: "" });
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

  const eventosPorDia = {};
  eventos.forEach(e => {
    const dia = parseInt(e.fecha.split("-")[2]);
    if (!eventosPorDia[dia]) eventosPorDia[dia] = [];
    eventosPorDia[dia].push(e);
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

  const abrirFormEvento = (dia) => {
    const fecha = `${anio}-${String(mes).padStart(2,"0")}-${String(dia).padStart(2,"0")}`;
    setForm({ titulo: "", fecha, hora: "", descripcion: "", categoria_id: categorias[0]?.id ?? "" });
    setMostrarForm(true);
  };

  const guardarEvento = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      await crearEvento({ ...form, categoria_id: form.categoria_id || null });
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
            <button className={styles.btnPrimario} onClick={() => abrirFormEvento(diaSelec)}>+ Añadir</button>
          </div>

          {eventosDelDia.length === 0
            ? <p className={styles.vacio}>Sin eventos este día.</p>
            : eventosDelDia.map(e => (
              <div key={e.id} className={styles.evento}>
                <span className={styles.eventoDot} style={{ background: e.categoria_color || "#6366f1" }} />
                <div className={styles.eventoInfo}>
                  <span className={styles.eventoTitulo}>{e.titulo}</span>
                  {e.hora && <span className={styles.eventoHora}>{e.hora}</span>}
                  {e.descripcion && <span className={styles.eventoDesc}>{e.descripcion}</span>}
                  <span className={styles.eventoMeta}>{e.categoria_nombre} · {e.creado_por}</span>
                </div>
                <button className={styles.btnBorrar} onClick={() => borrarEvento(e.id)}>✕</button>
              </div>
            ))
          }
        </div>
      )}

      {mostrarForm && (
        <div className={styles.overlay} onClick={() => setMostrarForm(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h2 className={styles.modalTitulo}>Nuevo evento</h2>
            <form className={styles.formEvento} onSubmit={guardarEvento}>
              <div className={styles.campo}>
                <label>Título</label>
                <input value={form.titulo} onChange={e => setForm(p => ({ ...p, titulo: e.target.value }))} required />
              </div>
              <div className={styles.campo}>
                <label>Fecha</label>
                <input type="date" value={form.fecha} onChange={e => setForm(p => ({ ...p, fecha: e.target.value }))} required />
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
                <button type="submit" className={styles.btnPrimario}>Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
