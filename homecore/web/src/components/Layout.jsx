import { Outlet, NavLink } from "react-router-dom";
import { Home, Package } from "lucide-react";
import styles from "./Layout.module.css";

export default function Layout() {
  return (
    <div className={styles.shell}>
      <nav className={styles.sidebar}>
        <div className={styles.logo}>HomeCore</div>
        <NavLink to="/" end className={({ isActive }) => isActive ? styles.linkActive : styles.link}>
          <Home size={18} /> Inicio
        </NavLink>
        <NavLink to="/inventario" className={({ isActive }) => isActive ? styles.linkActive : styles.link}>
          <Package size={18} /> Inventario
        </NavLink>
      </nav>
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}
