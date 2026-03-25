import { api } from "./client";

export const invitarUsuario = (data) => api.post("/api/admin/invitar", data);
