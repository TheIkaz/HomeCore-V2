import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import * as Icons from "lucide-react";
import { getApps } from "../api/apps";
import styles from "./Dashboard.module.css";

export default function Dashboard() {
  const [apps, setApps]       = useState([]);
  const [usuario, setUsuario] = useState("");
  const [error, setError]     = useState(null);

  useEffect(() => {
    getApps()
      .then((data) => {
        setApps(data.datos);
        setUsuario(data.usuario);
      })
      .catch(() => setError("No se pudieron cargar las aplicaciones"));
  }, []);

  if (error) return <p className={styles.error}>{error}</p>;

  return (
    <div>
      <h1 className={styles.titulo}>
        Bienvenido{usuario ? `, ${usuario}` : ""}
      </h1>
      <div className={styles.grid}>
        {apps.map((app) => (
          <AppCard key={app.nombre} app={app} />
        ))}
      </div>
    </div>
  );
}

function AppCard({ app }) {
  const Icon = Icons[app.icono] ?? Icons.Box;
  const contenido = (
    <>
      <Icon size={32} className={styles.icono} />
      <span className={styles.nombre}>{app.nombre_visible}</span>
    </>
  );

  if (app.url.startsWith("/")) {
    return <Link to={app.url} className={styles.card}>{contenido}</Link>;
  }
  return (
    <a href={app.url} className={styles.card} target="_blank" rel="noopener noreferrer">
      {contenido}
    </a>
  );
}
