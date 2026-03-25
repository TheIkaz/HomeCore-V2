import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { invitarUsuario } from "../../api/admin";
import styles from "./Invitar.module.css";

export default function Invitar() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ nombre: "", username: "", password: "", grupo: "familia" });
  const [creado, setCreado]   = useState(false);
  const [error, setError]     = useState(null);
  const [enviando, setEnviando] = useState(false);

  const cambiar = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const generar = async (e) => {
    e.preventDefault();
    setError(null);
    setCreado(false);
    setEnviando(true);
    try {
      await invitarUsuario(form);
      setCreado(true);
      setForm({ nombre: "", username: "", password: "", grupo: "familia" });
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
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
          <label>Nombre de usuario</label>
          <input name="username" value={form.username} onChange={cambiar} required placeholder="Ej: maria" />
        </div>
        <div className={styles.campo}>
          <label>Contraseña</label>
          <input name="password" type="password" value={form.password} onChange={cambiar} required placeholder="Contraseña inicial" />
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
          {enviando ? "Creando usuario..." : "Crear usuario"}
        </button>
      </form>

      {creado && (
        <p className={styles.exito}>Usuario creado correctamente.</p>
      )}
    </div>
  );
}
