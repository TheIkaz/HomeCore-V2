import { useEffect, useState } from "react";
import { getAgotados, modificarProducto } from "../../api/inventario";
import styles from "./Inventario.module.css";

export default function Agotados() {
  const [productos, setProductos] = useState([]);

  const cargar = () => getAgotados().then((d) => setProductos(d.datos));
  useEffect(() => { cargar(); }, []);

  const toggleLista = (p) =>
    modificarProducto(p.id, { en_lista_compra: !p.en_lista_compra }).then(cargar);

  return (
    <div>
      <h1 className={styles.titulo}>Productos agotados</h1>
      {productos.length === 0
        ? <p className={styles.vacio}>No hay productos agotados.</p>
        : (
          <div className={styles.tablaWrapper}>
            <table className={styles.tabla}>
              <thead>
                <tr><th>Nombre</th><th>Categoría</th><th>Cantidad</th><th>Lista compra</th></tr>
              </thead>
              <tbody>
                {productos.map((p) => (
                  <tr key={p.id}>
                    <td>{p.nombre}</td>
                    <td>{p.categoria}</td>
                    <td>{p.cantidad} {p.unidad}</td>
                    <td>
                      <button onClick={() => toggleLista(p)}>
                        {p.en_lista_compra ? "✓ En lista" : "+ Añadir"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      }
    </div>
  );
}
