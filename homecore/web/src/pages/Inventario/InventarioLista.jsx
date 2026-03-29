import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getProductos, modificarProducto, eliminarProducto } from "../../api/inventario";
import ProductoForm from "./ProductoForm";
import ConfirmDialog from "../../components/ConfirmDialog";
import styles from "./Inventario.module.css";

export default function InventarioLista() {
  const navigate = useNavigate();
  const [productos, setProductos]         = useState([]);
  const [editando, setEditando]           = useState(null);
  const [error, setError]                 = useState(null);
  const [cargando, setCargando]           = useState(true);
  const [confirmar, setConfirmar]         = useState(null);
  const [busqueda, setBusqueda]           = useState("");
  const [categoriaFiltro, setCategoriaFiltro] = useState("");

  const cargar = () =>
    getProductos()
      .then((d) => setProductos(d.datos))
      .catch(() => setError("Error al cargar el inventario"))
      .finally(() => setCargando(false));

  useEffect(() => { cargar(); }, []);

  const toggleLista = (p) =>
    modificarProducto(p.id, { en_lista_compra: !p.en_lista_compra }).then(cargar);

  const ajustarCantidad = (p, delta) =>
    modificarProducto(p.id, { cantidad: Math.max(0, p.cantidad + delta) }).then(cargar);

  const eliminar = (id) => setConfirmar(id);
  const confirmarEliminar = () => {
    eliminarProducto(confirmar).then(cargar);
    setConfirmar(null);
  };

  // Categorías únicas para el selector
  const categorias = [...new Set(productos.map(p => p.categoria).filter(Boolean))].sort();

  // Filtrado
  const filtrados = productos.filter(p => {
    const coincideTexto = p.nombre.toLowerCase().includes(busqueda.toLowerCase());
    const coincideCat   = !categoriaFiltro || p.categoria === categoriaFiltro;
    return coincideTexto && coincideCat;
  });

  // Agrupación por categoría
  const grupos = filtrados.reduce((acc, p) => {
    const key = p.categoria || "Sin categoría";
    if (!acc[key]) acc[key] = [];
    acc[key].push(p);
    return acc;
  }, {});
  const gruposOrdenados = Object.keys(grupos).sort();

  if (cargando) return <p className={styles.cargando}>Cargando...</p>;
  if (error)    return <p className={styles.errorMsg}>{error}</p>;

  return (
    <div>
      {confirmar && (
        <ConfirmDialog
          mensaje="¿Eliminar este producto?"
          onConfirmar={confirmarEliminar}
          onCancelar={() => setConfirmar(null)}
        />
      )}
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

      <div className={styles.barraFiltros}>
        <input
          className={styles.inputBusqueda}
          type="text"
          placeholder="Buscar por nombre..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
        />
        <select
          className={styles.selectCategoria}
          value={categoriaFiltro}
          onChange={e => setCategoriaFiltro(e.target.value)}
        >
          <option value="">Todas las categorías</option>
          {categorias.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {filtrados.length === 0 ? (
        <p className={styles.vacio}>No se encontraron productos.</p>
      ) : (
        <div className={styles.tablaWrapper}>
          {gruposOrdenados.map(grupo => (
            <div key={grupo} className={styles.grupoCategoria}>
              <div className={styles.grupoTitulo}>{grupo}</div>
              <table className={styles.tabla}>
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Cantidad</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {grupos[grupo].map((p) => (
                    <tr key={p.id} className={p.agotado ? styles.filaAgotada : ""}>
                      <td>{p.nombre}</td>
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
          ))}
        </div>
      )}
    </div>
  );
}
