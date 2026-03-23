import { api } from "./client";

export const getApps = () => api.get("/api/apps/catalogo");
