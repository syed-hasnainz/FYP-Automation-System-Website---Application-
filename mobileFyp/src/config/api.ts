import { NativeModules, Platform } from 'react-native';

/** Live backend on Render — https://hamdard-automation.onrender.com */
export const REMOTE_API_ORIGIN = 'https://hamdard-automation.onrender.com';

/**
 * Dev mode (Expo / Metro): uses REMOTE_API_ORIGIN below.
 * Local PC testing: set to http://YOUR_PC_IP:3000 and run fypFinal locally.
 */
export const DEV_PC_LAN_ORIGIN = REMOTE_API_ORIGIN;

/** Release APK — same Render URL. */
export const PRODUCTION_API_ORIGIN = REMOTE_API_ORIGIN;

function getDevHostFromMetro(): string | null {
  const scriptURL: string | undefined = NativeModules?.SourceCode?.scriptURL;
  if (!scriptURL) {
    return null;
  }
  const match = scriptURL.match(/^(https?:\/\/)([^:/]+)(?::\d+)?\//i);
  if (!match) {
    return null;
  }
  return match[2] ?? null;
}

function isLoopbackHost(host: string) {
  const normalized = host.toLowerCase();
  return (
    normalized === 'localhost' ||
    normalized === '127.0.0.1' ||
    normalized === '0.0.0.0'
  );
}

function toOrigin(host: string, port = 3000) {
  return /^https?:\/\//i.test(host) ? host : `http://${host}:${port}`;
}

function getDevBaseUrl() {
  const remote = REMOTE_API_ORIGIN.trim();
  if (remote) {
    return remote;
  }

  const lan = DEV_PC_LAN_ORIGIN.trim();
  if (lan) {
    return lan;
  }

  const metroHost = getDevHostFromMetro();
  if (metroHost && !isLoopbackHost(metroHost)) {
    return toOrigin(metroHost);
  }

  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:3000';
  }

  return 'http://localhost:3000';
}

export function buildApiBaseUrlCandidates(): string[] {
  const candidates: string[] = [];
  const add = (value?: string | null) => {
    const trimmed = value?.trim();
    if (trimmed && !candidates.includes(trimmed)) {
      candidates.push(trimmed);
    }
  };

  add(REMOTE_API_ORIGIN);
  add(PRODUCTION_API_ORIGIN);
  add(DEV_PC_LAN_ORIGIN);

  const metroHost = getDevHostFromMetro();
  if (metroHost && !isLoopbackHost(metroHost)) {
    add(toOrigin(metroHost));
  }

  if (Platform.OS === 'android') {
    add('http://10.0.2.2:3000');
  }

  add('http://localhost:3000');

  return candidates;
}

export const API_BASE_URL = __DEV__ ? getDevBaseUrl() : PRODUCTION_API_ORIGIN;

export const API_BASE_URL_CANDIDATES = __DEV__
  ? buildApiBaseUrlCandidates()
  : [PRODUCTION_API_ORIGIN];

export const apiPath = (path: string) =>
  `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
