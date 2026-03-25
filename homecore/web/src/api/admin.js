import { api } from "./client";

export const invitarUsuario = (data) => api.post("/api/admin/invitar", data);
export const getSistema      = ()     => api.get("/api/admin/sistema");
