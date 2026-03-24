import { Outlet, Link } from "react-router-dom";
import { Home } from "lucide-react";
import styles from "./Layout.module.css";

export default function Layout() {
  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <Link to="/" className={styles.homeBtn} title="Inicio">
          <Home size={20} />
        </Link>
        <span className={styles.logo}>HomeCore</span>
      </header>
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}
