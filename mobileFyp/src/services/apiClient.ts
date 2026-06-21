import axios from 'axios';
import {
  API_BASE_URL,
  API_BASE_URL_CANDIDATES,
  PRODUCTION_API_ORIGIN,
  buildApiBaseUrlCandidates,
} from '../config/api';
import type { AuthUser } from '../types/auth';
import { useAuthStore } from '../store/authStore';
import { getStoredUser } from '../utils/storage';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

let resolvedBaseUrl: string | null = null;
let resolvingBaseUrlPromise: Promise<string> | null = null;

async function isReachable(baseUrl: string) {
  // Render free tier cold start can take ~1 min
  const timeout = baseUrl.includes('onrender.com') ? 90000 : 4000;
  try {
    await axios.get(`${baseUrl}/api/health`, { timeout });
    return true;
  } catch {
    return false;
  }
}

export function resetApiBaseUrl() {
  resolvedBaseUrl = null;
  resolvingBaseUrlPromise = null;
  apiClient.defaults.baseURL = API_BASE_URL;
}

async function buildReleaseCandidates(): Promise<string[]> {
  const candidates: string[] = [];
  const add = (value?: string | null) => {
    const trimmed = value?.trim();
    if (trimmed && !candidates.includes(trimmed)) {
      candidates.push(trimmed);
    }
  };

  const prod = PRODUCTION_API_ORIGIN.trim();
  if (prod && !prod.includes('your-production-server')) {
    add(prod);
  }

  return candidates.length > 0 ? candidates : [API_BASE_URL];
}

async function resolveBaseUrl() {
  if (resolvedBaseUrl) {
    return resolvedBaseUrl;
  }
  if (resolvingBaseUrlPromise) {
    return resolvingBaseUrlPromise;
  }

  resolvingBaseUrlPromise = (async () => {
    const candidates = __DEV__
      ? buildApiBaseUrlCandidates()
      : await buildReleaseCandidates();

    for (const candidate of candidates) {
      if (await isReachable(candidate)) {
        resolvedBaseUrl = candidate;
        apiClient.defaults.baseURL = candidate;
        if (__DEV__) {
          console.log(`[API] Using backend: ${candidate}`);
        }
        return candidate;
      }
    }

    resolvedBaseUrl = API_BASE_URL;
    apiClient.defaults.baseURL = API_BASE_URL;
    if (__DEV__) {
      console.warn(
        `[API] No reachable backend. Tried: ${candidates.join(', ')}. ` +
          'Check internet and Render URL in src/config/api.ts (REMOTE_API_ORIGIN). ' +
          'Free tier: first request after sleep may take ~1 minute.',
      );
    } else {
      console.warn(
        `[API] No reachable backend. Tried: ${candidates.join(', ')}. ` +
          'Check internet and Render URL in src/config/api.ts (REMOTE_API_ORIGIN).',
      );
    }
    return API_BASE_URL;
  })();

  try {
    return await resolvingBaseUrlPromise;
  } finally {
    resolvingBaseUrlPromise = null;
  }
}

/** Call before first API request so the correct LAN/emulator URL is selected. */
export async function ensureApiReady() {
  return resolveBaseUrl();
}

export function getResolvedApiBaseUrl() {
  return resolvedBaseUrl ?? API_BASE_URL;
}

apiClient.interceptors.request.use(async (config) => {
  const baseURL = await resolveBaseUrl();
  return {
    ...config,
    baseURL: config.baseURL ?? baseURL,
  };
});

export async function getAuthHeaders() {
  const storedUser = await getStoredUser<AuthUser>();
  const user = storedUser ?? useAuthStore.getState().user;
  if (!user?.id) {
    return {};
  }
  return {
    'x-user-id': user.id,
    'x-user-role': user.role,
  };
}

export async function authGet<T>(url: string, params?: Record<string, string>) {
  const headers = await getAuthHeaders();
  const { data } = await apiClient.get<T>(url, { headers, params });
  return data;
}

export async function authPost<T>(url: string, body?: unknown) {
  const headers = await getAuthHeaders();
  const { data } = await apiClient.post<T>(url, body, { headers });
  return data;
}

export async function authPut<T>(url: string, body?: unknown) {
  const headers = await getAuthHeaders();
  const { data } = await apiClient.put<T>(url, body, { headers });
  return data;
}

export async function authPatch<T>(url: string, body?: unknown) {
  const headers = await getAuthHeaders();
  const { data } = await apiClient.patch<T>(url, body, { headers });
  return data;
}

export async function authDelete<T>(url: string, body?: unknown) {
  const headers = await getAuthHeaders();
  const { data } = await apiClient.delete<T>(url, { headers, data: body });
  return data;
}
