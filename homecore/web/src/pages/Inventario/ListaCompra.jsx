import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getListaCompra, getProductos, modificarProducto } from "../../api/inventario";
import styles from "./Inventario.module.css";

export default function ListaCompra() {
  const navigate = useNavigate();
  const [productos, setProductos]           = useState([]);
  const [todosProductos, setTodosProductos] = useState([]);
  const [cantidades, setCantidades]         = useState({});
  const [mostrarPanel, setMostrarPanel]     = useState(false);

  const cargar = () => Promise.all([
    getListaCompra().then((d) => setProductos(d.datos)),
    getProductos().then((d) => setTodosProductos(d.datos)),
  ]);

  useEffect(() => { cargar(); }, []);

  const setCantidad = (id, val) =>
    setCantidades((prev) => ({ ...prev, [id]: val }));

  const marcarComprado = (p) => {
    const qty = parseFloat(cantidades[p.id] ?? 1) || 0;
    modificarProducto(p.id, {
      cantidad: p.cantidad + qty,
      en_lista_compra: false,
    }).then(cargar);
  };

  const añadirALista = (p) =>
    modificarProducto(p.id, { en_lista_compra: true }).then(() => {
      setMostrarPanel(false);
      cargar();
    });

  const enListaIds  = new Set(productos.map((p) => p.id));
  const disponibles = todosProductos.filter((p) => !enListaIds.has(p.id));

  return (
    <div>
      <button className={styles.btnVolver} onClick={() => navigate("/inventario")}>← Volver</button>
      <div className={styles.header}>
        <h1 className={styles.titulo}>Lista de la compra</h1>
        <button className={styles.btnPrimario} onClick={() => setMostrarPanel((v) => !v)}>
          + Añadir artículo
        </button>
      </div>

      {mostrarPanel && (
        <div className={styles.panelAnadir}>
          {disponibles.length === 0
            ? <p className={styles.vacio}>Todos los productos ya están en la lista.</p>
            : disponibles.map((p) => (
              <div key={p.id} className={styles.itemDisponible}>
                <span>{p.nombre} <small>({p.categoria})</small></span>
                <button onClick={() => añadirALista(p)}>Añadir</button>
              </div>
            ))
          }
        </div>
      )}

      {productos.length === 0
        ? <p className={styles.vacio}>La lista de la compra está vacía.</p>
        : (
          <ul className={styles.listaCompra}>
            {productos.map((p) => (
              <li key={p.id} className={styles.itemCompra}>
                <span className={styles.itemNombre}>
                  {p.nombre} <small>({p.categoria})</small>
                </span>
                <div className={styles.itemCompraAcciones}>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={cantidades[p.id] ?? 1}
                    onChange={(e) => setCantidad(p.id, e.target.value)}
                    className={styles.inputCantidadCompra}
                  />
                  <span className={styles.unidadCompra}>{p.unidad}</span>
                  <button className={styles.btnComprado} onClick={() => marcarComprado(p)}>
                    Comprado
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )
      }
    </div>
  );
}
