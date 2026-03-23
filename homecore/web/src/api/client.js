async function apiFetch(url, options = {}) {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.mensaje || "Error en la petición");
  return data;
}

export const api = {
  get:    (url)         => apiFetch(url),
  post:   (url, body)   => apiFetch(url, { method: "POST",   body: JSON.stringify(body) }),
  put:    (url, body)   => apiFetch(url, { method: "PUT",    body: JSON.stringify(body) }),
  patch:  (url, body)   => apiFetch(url, { method: "PATCH",  body: JSON.stringify(body) }),
  delete: (url)         => apiFetch(url, { method: "DELETE" }),
};
