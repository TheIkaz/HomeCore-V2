import { Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import InventarioInicio from "./pages/Inventario/InventarioInicio";
import InventarioLista from "./pages/Inventario/InventarioLista";
import Agotados from "./pages/Inventario/Agotados";
import ListaCompra from "./pages/Inventario/ListaCompra";
import Invitar from "./pages/Admin/Invitar";
import Sistema from "./pages/Admin/Sistema";
import Calendario from "./pages/Calendario/Calendario";
import Layout from "./components/Layout";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/"                      element={<Dashboard />} />
        <Route path="/inventario"            element={<InventarioInicio />} />
        <Route path="/inventario/lista"      element={<InventarioLista />} />
        <Route path="/inventario/agotados"   element={<Agotados />} />
        <Route path="/inventario/compra"     element={<ListaCompra />} />
        <Route path="/admin/invitar"          element={<Invitar />} />
        <Route path="/admin/sistema"          element={<Sistema />} />
        <Route path="/calendario"             element={<Calendario />} />
      </Route>
    </Routes>
  );
}
