import axios, { AxiosRequestConfig } from 'axios';
import { storage } from './storage';

const BASE = process.env.EXPO_PUBLIC_BACKEND_URL;

async function authHeader(useAdmin = false): Promise<Record<string, string>> {
  const key = useAdmin ? 'admin_token' : 'auth_token';
  const token = await storage.getItem(key);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const api = {
  base: BASE,
  async get<T = any>(path: string, opts: { admin?: boolean; params?: any } = {}): Promise<T> {
    const headers = await authHeader(opts.admin);
    const res = await axios.get(`${BASE}${path}`, { headers, params: opts.params });
    return res.data;
  },
  async post<T = any>(path: string, body: any, opts: { admin?: boolean; config?: AxiosRequestConfig } = {}): Promise<T> {
    const headers = await authHeader(opts.admin);
    const res = await axios.post(`${BASE}${path}`, body, { headers, ...(opts.config || {}) });
    return res.data;
  },
};
