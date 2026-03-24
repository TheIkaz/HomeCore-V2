import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getProductos, modificarProducto, eliminarProducto } from "../../api/inventario";
import ProductoForm from "./ProductoForm";
import styles from "./Inventario.module.css";

export default function InventarioLista() {
  const navigate = useNavigate();
  const [productos, setProductos] = useState([]);
  const [editando, setEditando]   = useState(null);
  const [error, setError]         = useState(null);

  const cargar = () =>
    getProductos()
      .then((d) => setProductos(d.datos))
      .catch(() => setError("Error al cargar el inventario"));

  useEffect(() => { cargar(); }, []);

  const toggleLista = (p) =>
    modificarProducto(p.id, { en_lista_compra: !p.en_lista_compra }).then(cargar);

  const ajustarCantidad = (p, delta) =>
    modificarProducto(p.id, { cantidad: Math.max(0, p.cantidad + delta) }).then(cargar);

  const eliminar = (id) => {
    if (confirm("¿Eliminar este producto?")) eliminarProducto(id).then(cargar);
  };

  if (error) return <p className={styles.errorMsg}>{error}</p>;

  return (
    <div>
      <button className={styles.btnVolver} onClick={() => navigate("/inventario")}>← Volver</button>
      <div className={styles.header}>
        <h1 className={styles.titulo}>Inventario</h1>
        <button className={styles.btnPrimario} onClick={() => setEditando({})}>
          + Añadir
        </button>
      </div>

      {editando !== null && (
        <ProductoForm
          producto={editando}
          onGuardado={() => { setEditando(null); cargar(); }}
          onCancelar={() => setEditando(null)}
        />
      )}

      <div className={styles.tablaWrapper}>
        <table className={styles.tabla}>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Categoría</th>
              <th>Cantidad</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {productos.map((p) => (
              <tr key={p.id} className={p.agotado ? styles.filaAgotada : ""}>
                <td>{p.nombre}</td>
                <td>{p.categoria}</td>
                <td>
                  <div className={styles.cantidadControl}>
                    <button className={styles.btnCantidad} onClick={() => ajustarCantidad(p, -1)}>−</button>
                    <span>{p.cantidad} {p.unidad}</span>
                    <button className={styles.btnCantidad} onClick={() => ajustarCantidad(p, 1)}>+</button>
                  </div>
                </td>
                <td>
                  {p.agotado
                    ? <span className={styles.badgeAgotado}>Agotado</span>
                    : <span className={styles.badgeOk}>OK</span>
                  }
                </td>
                <td className={styles.acciones}>
                  <button onClick={() => toggleLista(p)} title="Lista de la compra">
                    {p.en_lista_compra ? "✓ Lista" : "+ Lista"}
                  </button>
                  <button onClick={() => setEditando(p)}>Editar</button>
                  <button className={styles.btnEliminar} onClick={() => eliminar(p.id)}>Eliminar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
