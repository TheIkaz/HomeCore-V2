import { useState } from "react";
import { crearProducto, editarProducto } from "../../api/inventario";
import styles from "./Inventario.module.css";

export default function ProductoForm({ producto, onGuardado, onCancelar }) {
  const esNuevo = !producto.id;
  const [form, setForm] = useState({
    id:              producto.id             ?? "",
    nombre:          producto.nombre         ?? "",
    categoria:       producto.categoria      ?? "",
    cantidad:        producto.cantidad       ?? 0,
    unidad:          producto.unidad         ?? "",
    umbral_agotado:  producto.umbral_agotado ?? 0,
  });
  const [error, setError] = useState(null);

  const cambiar = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const guardar = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      const data = {
        ...form,
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

      {esNuevo && (
        <div className={styles.campo}>
          <label>ID</label>
          <input name="id" value={form.id} onChange={cambiar} required />
        </div>
      )}
      <div className={styles.campo}>
        <label>Nombre</label>
        <input name="nombre" value={form.nombre} onChange={cambiar} required />
      </div>
      <div className={styles.campo}>
        <label>Categoría</label>
        <input name="categoria" value={form.categoria} onChange={cambiar} required />
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
