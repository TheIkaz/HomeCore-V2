import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getSistema } from "../../api/admin";
import styles from "./Sistema.module.css";

const MAX_PUNTOS = 24; // 2 minutos a 5s por lectura

function Sparkline({ datos, color = "#6366f1" }) {
  if (!datos || datos.length < 2) return <svg width={120} height={40} />;
  const max = Math.max(...datos, 1);
  const w = 120, h = 40;
  const pts = datos
    .map((v, i) => `${(i / (datos.length - 1)) * w},${h - (v / max) * h}`)
    .join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className={styles.sparkline}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

function Barra({ porcentaje, color }) {
  return (
    <div className={styles.barra}>
      <div className={styles.barraRelleno} style={{ width: `${porcentaje}%`, background: color }} />
    </div>
  );
}

function colorPorcentaje(p) {
  if (p >= 85) return "#ef4444";
  if (p >= 60) return "#f59e0b";
  return "#6366f1";
}

function colorTemp(t) {
  if (t >= 75) return "#ef4444";
  if (t >= 60) return "#f59e0b";
  return "#6366f1";
}

export default function Sistema() {
  const navigate = useNavigate();
  const [datos, setDatos]     = useState(null);
  const [error, setError]     = useState(null);
  const historial = useRef({ cpu: [], ram: [], temp: [] });

  const actualizar = () => {
    getSistema()
      .then((d) => {
        const h = historial.current;
        const push = (arr, val) => {
          arr.push(val);
          if (arr.length > MAX_PUNTOS) arr.shift();
        };
        push(h.cpu,  d.cpu);
        push(h.ram,  d.ram.porcentaje);
        push(h.temp, d.temperatura ?? 0);
        setDatos({ ...d, historial: { ...h } });
      })
      .catch(() => setError("No se pudo conectar con la Pi."));
  };

  useEffect(() => {
    actualizar();
    const id = setInterval(actualizar, 5000);
    return () => clearInterval(id);
  }, []);

  if (error) return <p className={styles.error}>{error}</p>;
  if (!datos) return <p className={styles.cargando}>Cargando...</p>;

  const { cpu, ram, disco, temperatura, historial: h } = datos;

  return (
    <div>
      <button className={styles.btnVolver} onClick={() => navigate("/")}>← Volver</button>
      <h1 className={styles.titulo}>Estado Raspberry</h1>

      <div className={styles.grid}>

        <div className={styles.tarjeta}>
          <div className={styles.cabecera}>
            <span className={styles.etiqueta}>CPU</span>
            <span className={styles.valor} style={{ color: colorPorcentaje(cpu) }}>{cpu}%</span>
          </div>
          <Barra porcentaje={cpu} color={colorPorcentaje(cpu)} />
          <Sparkline datos={h.cpu} color={colorPorcentaje(cpu)} />
        </div>

        <div className={styles.tarjeta}>
          <div className={styles.cabecera}>
            <span className={styles.etiqueta}>RAM</span>
            <span className={styles.valor} style={{ color: colorPorcentaje(ram.porcentaje) }}>
              {ram.usado} / {ram.total} GB
            </span>
          </div>
          <Barra porcentaje={ram.porcentaje} color={colorPorcentaje(ram.porcentaje)} />
          <Sparkline datos={h.ram} color={colorPorcentaje(ram.porcentaje)} />
        </div>

        {temperatura !== null && (
          <div className={styles.tarjeta}>
            <div className={styles.cabecera}>
              <span className={styles.etiqueta}>Temperatura</span>
              <span className={styles.valor} style={{ color: colorTemp(temperatura) }}>{temperatura}°C</span>
            </div>
            <Barra porcentaje={Math.min((temperatura / 85) * 100, 100)} color={colorTemp(temperatura)} />
            <Sparkline datos={h.temp} color={colorTemp(temperatura)} />
          </div>
        )}

        <div className={styles.tarjeta}>
          <div className={styles.cabecera}>
            <span className={styles.etiqueta}>Disco</span>
            <span className={styles.valor} style={{ color: colorPorcentaje(disco.porcentaje) }}>
              {disco.usado} / {disco.total} GB
            </span>
          </div>
          <Barra porcentaje={disco.porcentaje} color={colorPorcentaje(disco.porcentaje)} />
          <div className={styles.discoPorcentaje}>{disco.porcentaje}% usado</div>
        </div>

      </div>
    </div>
  );
}
