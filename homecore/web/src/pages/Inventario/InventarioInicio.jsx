import { NavLink } from "react-router-dom";
import { List, ShoppingCart, AlertTriangle } from "lucide-react";
import styles from "./Inventario.module.css";

const opciones = [
  { to: "/inventario/lista",    label: "Todo el inventario", Icon: List          },
  { to: "/inventario/agotados", label: "Agotados",           Icon: AlertTriangle },
  { to: "/inventario/compra",   label: "Lista de la compra", Icon: ShoppingCart  },
];

export default function InventarioInicio() {
  return (
    <div>
      <h1 className={styles.titulo}>Inventario</h1>
      <div className={styles.grid}>
        {opciones.map(({ to, label, Icon }) => (
          <NavLink key={to} to={to} className={styles.card}>
            <Icon size={28} className={styles.icono} />
            <span>{label}</span>
          </NavLink>
        ))}
      </div>
    </div>
  );
}
