import styles from "./ConfirmDialog.module.css";

export default function ConfirmDialog({ mensaje, onConfirmar, onCancelar }) {
  return (
    <div className={styles.overlay}>
      <div className={styles.dialog}>
        <p className={styles.mensaje}>{mensaje}</p>
        <div className={styles.acciones}>
          <button onClick={onCancelar}>Cancelar</button>
          <button className={styles.btnPeligro} onClick={onConfirmar}>Eliminar</button>
        </div>
      </div>
    </div>
  );
}
