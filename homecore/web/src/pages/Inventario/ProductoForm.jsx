import { useState } from "react";
import { crearProducto, editarProducto } from "../../api/inventario";
import styles from "./Inventario.module.css";

export default function ProductoForm({ producto, categorias = [], onGuardado, onCancelar }) {
  const esNuevo = !producto.id;

  const catInicial = producto.categoria ?? "";
  const esExistente = !catInicial || categorias.includes(catInicial);

  const [form, setForm] = useState({
    nombre:          producto.nombre         ?? "",
    cantidad:        producto.cantidad       ?? 0,
    unidad:          producto.unidad         ?? "",
    umbral_agotado:  producto.umbral_agotado ?? 0,
  });
  const [catSelec,   setCatSelec]   = useState(esExistente ? catInicial : "__nueva__");
  const [catNueva,   setCatNueva]   = useState(esExistente ? "" : catInicial);
  const [error, setError] = useState(null);

  const cambiar = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const categoriaFinal = catSelec === "__nueva__" ? catNueva.trim() : catSelec;

  const guardar = async (e) => {
    e.preventDefault();
    setError(null);
    if (!categoriaFinal) {
      setError("La categoría es obligatoria");
      return;
    }
    try {
      const data = {
        ...form,
        categoria:      categoriaFinal,
        cantidad:       parseFloat(form.cantidad),
        umbral_agotado: parseFloat(form.umbral_agotado),
      };
      if (esNuevo) {
        await crearProducto(data);
      } else {
        await editarProducto(producto.id, data);
      }
      onGuardado();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <form className={styles.form} onSubmit={guardar}>
      <h2 className={styles.formTitulo}>{esNuevo ? "Nuevo producto" : "Editar producto"}</h2>

      <div className={styles.campo}>
        <label>Nombre</label>
        <input name="nombre" value={form.nombre} onChange={cambiar} required />
      </div>

      <div className={styles.campo}>
        <label>Categoría</label>
        <select
          className={styles.selectCampo}
          value={catSelec}
          onChange={e => setCatSelec(e.target.value)}
          required
        >
          <option value="" disabled>Selecciona una categoría</option>
          {categorias.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
          <option value="__nueva__">── Nueva categoría ──</option>
        </select>
        {catSelec === "__nueva__" && (
          <input
            className={styles.inputNuevaCat}
            placeholder="Nombre de la nueva categoría"
            value={catNueva}
            onChange={e => setCatNueva(e.target.value)}
            required
            autoFocus
          />
        )}
      </div>

      <div className={styles.campo}>
        <label>Cantidad</label>
        <input name="cantidad" type="number" step="any" value={form.cantidad} onChange={cambiar} required />
      </div>
      <div className={styles.campo}>
        <label>Unidad</label>
        <input name="unidad" value={form.unidad} onChange={cambiar} required placeholder="ud, kg, L..." />
      </div>
      <div className={styles.campo}>
        <label>Umbral agotado</label>
        <input name="umbral_agotado" type="number" step="any" value={form.umbral_agotado} onChange={cambiar} required />
      </div>

      {error && <p className={styles.errorMsg}>{error}</p>}

      <div className={styles.formAcciones}>
        <button type="submit" className={styles.btnPrimario}>Guardar</button>
        <button type="button" onClick={onCancelar}>Cancelar</button>
      </div>
    </form>
  );
}
