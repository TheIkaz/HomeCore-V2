import { useEffect, useState } from "react";
import { getListaCompra, modificarProducto } from "../../api/inventario";
import styles from "./Inventario.module.css";

export default function ListaCompra() {
  const [productos, setProductos] = useState([]);

  const cargar = () => getListaCompra().then((d) => setProductos(d.datos));
  useEffect(() => { cargar(); }, []);

  const marcarComprado = (p) =>
    modificarProducto(p.id, { en_lista_compra: false }).then(cargar);

  return (
    <div>
      <h1 className={styles.titulo}>Lista de la compra</h1>
      {productos.length === 0
        ? <p className={styles.vacio}>La lista de la compra está vacía.</p>
        : (
          <ul className={styles.listaCompra}>
            {productos.map((p) => (
              <li key={p.id} className={styles.itemCompra}>
                <span>{p.nombre} <small>({p.categoria})</small></span>
                <button className={styles.btnComprado} onClick={() => marcarComprado(p)}>
                  Comprado
                </button>
              </li>
            ))}
          </ul>
        )
      }
    </div>
  );
}
