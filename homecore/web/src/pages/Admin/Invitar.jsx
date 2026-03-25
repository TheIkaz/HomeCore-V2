import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { invitarUsuario } from "../../api/admin";
import styles from "./Invitar.module.css";

export default function Invitar() {
  const navigate = useNavigate();
  const [form, setForm]               = useState({ nombre: "", username: "", grupo: "familia" });
  const [credenciales, setCredenciales] = useState(null);
  const [error, setError]             = useState(null);
  const [enviando, setEnviando]       = useState(false);
  const [copiado, setCopiado]         = useState(false);

  const cambiar = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const generar = async (e) => {
    e.preventDefault();
    setError(null);
    setCredenciales(null);
    setEnviando(true);
    try {
      const res = await invitarUsuario(form);
      setCredenciales(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  };

  const copiar = () => {
    const texto = `Usuario: ${credenciales.username}\nContraseña: ${credenciales.password}`;
    navigator.clipboard.writeText(texto).then(() => {
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
          {enviando ? "Creando usuario..." : "Crear usuario"}
        </button>
      </form>

      {credenciales && (
        <div className={styles.resultado}>
          <p className={styles.resultadoTitulo}>Usuario creado. Comparte estas credenciales:</p>
          <div className={styles.credencialesBox}>
            <div className={styles.credencialFila}>
              <span className={styles.credencialLabel}>Usuario</span>
              <span className={styles.credencialValor}>{credenciales.username}</span>
            </div>
            <div className={styles.credencialFila}>
              <span className={styles.credencialLabel}>Contraseña temporal</span>
              <span className={styles.credencialValor}>{credenciales.password}</span>
            </div>
          </div>
          <button className={styles.btnCopiar} onClick={copiar}>
            {copiado ? "¡Copiado!" : "Copiar credenciales"}
          </button>
          <p className={styles.nota}>El usuario deberá cambiar la contraseña en su primer inicio de sesión.</p>
        </div>
      )}
    </div>
  );
}
