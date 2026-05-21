import { hc } from "hono/client";
import type { AppType } from "../../api";

const client = hc<AppType>("/");
export const api = client.api;

export function getToken() {
  return localStorage.getItem("admin_token") || "";
}

export function setToken(token: string) {
  localStorage.setItem("admin_token", token);
}

export function clearToken() {
  localStorage.removeItem("admin_token");
}

export function authHeaders() {
  return { Authorization: `Bearer ${getToken()}` };
}

// Raw fetch helpers for multipart/file uploads
export async function apiFetch(path: string, options: RequestInit = {}) {
  const headers = { Authorization: `Bearer ${getToken()}`, ...((options.headers as any) || {}) };
  const res = await fetch(`/api${path}`, { ...options, headers });
  return res;
}
