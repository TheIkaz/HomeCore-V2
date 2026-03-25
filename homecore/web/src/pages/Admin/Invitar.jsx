import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { invitarUsuario } from "../../api/admin";
import styles from "./Invitar.module.css";

export default function Invitar() {
  const navigate = useNavigate();
  const [form, setForm]         = useState({ nombre: "", email: "", username: "", grupo: "familia" });
  const [enlace, setEnlace]     = useState(null);
  const [error, setError]       = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [copiado, setCopiado]   = useState(false);

  const cambiar = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const generar = async (e) => {
    e.preventDefault();
    setError(null);
    setEnlace(null);
    setEnviando(true);
    try {
      const res = await invitarUsuario(form);
      setEnlace(res.enlace);
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  };

  const copiar = () => {
    navigator.clipboard.writeText(enlace).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    });
  };

  return (
    <div>
      <button className={styles.btnVolver} onClick={() => navigate("/")}>← Volver</button>
      <h1 className={styles.titulo}>Invitar usuario</h1>

      <form className={styles.form} onSubmit={generar}>
        <div className={styles.campo}>
          <label>Nombre completo</label>
          <input name="nombre" value={form.nombre} onChange={cambiar} required placeholder="Ej: María García" />
        </div>
        <div className={styles.campo}>
          <label>Email</label>
          <input name="email" type="email" value={form.email} onChange={cambiar} required placeholder="correo@ejemplo.com" />
        </div>
        <div className={styles.campo}>
          <label>Nombre de usuario</label>
          <input name="username" value={form.username} onChange={cambiar} required placeholder="Ej: maria" />
        </div>
        <div className={styles.campo}>
          <label>Grupo</label>
          <select name="grupo" value={form.grupo} onChange={cambiar} className={styles.select}>
            <option value="familia">Familia</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        {error && <p className={styles.error}>{error}</p>}

        <button type="submit" className={styles.btnPrimario} disabled={enviando}>
          {enviando ? "Creando usuario..." : "Crear usuario y generar enlace"}
        </button>
      </form>

      {enlace && (
        <div className={styles.resultado}>
          <p className={styles.resultadoTitulo}>Usuario creado. Envía este enlace para que establezca su contraseña:</p>
          <div className={styles.enlaceBox}>
            <span className={styles.enlaceTexto}>{enlace}</span>
            <button className={styles.btnCopiar} onClick={copiar}>
              {copiado ? "¡Copiado!" : "Copiar"}
            </button>
          </div>
          <p className={styles.nota}>El enlace es de un solo uso.</p>
        </div>
      )}
    </div>
  );
}
