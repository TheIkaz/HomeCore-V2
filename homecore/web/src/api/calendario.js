import { api } from "./client";

export const getEventos       = (mes, anio)  => api.get(`/api/calendario/eventos?mes=${mes}&anio=${anio}`);
export const crearEvento      = (data)        => api.post("/api/calendario/eventos", data);
export const actualizarEvento = (id, data)    => api.put(`/api/calendario/eventos/${id}`, data);
export const eliminarEvento   = (id)          => api.delete(`/api/calendario/eventos/${id}`);
export const getCategorias    = ()            => api.get("/api/calendario/categorias");
export const crearCategoria   = (data)        => api.post("/api/calendario/categorias", data);
