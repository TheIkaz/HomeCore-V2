import { api } from "./client";

const BASE = "/api/inventario";

export const getProductos       = ()             => api.get(BASE);
export const getAgotados        = ()             => api.get(`${BASE}/agotados`);
export const getListaCompra     = ()             => api.get(`${BASE}/lista-compra`);
export const buscarProductos    = (params)       => api.get(`${BASE}/buscar?${new URLSearchParams(params)}`);
export const crearProducto      = (data)         => api.post(BASE, data);
export const editarProducto     = (id, data)     => api.put(`${BASE}/${id}`, data);
export const modificarProducto  = (id, cambios)  => api.patch(`${BASE}/${id}`, cambios);
export const eliminarProducto   = (id)           => api.delete(`${BASE}/${id}`);
export const compraHecha        = (items)        => api.post(`${BASE}/compra-hecha`, { items });
