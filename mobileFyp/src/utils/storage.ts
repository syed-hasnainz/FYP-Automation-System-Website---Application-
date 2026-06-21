import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  token: 'token',
  user: 'user',
  sessionExpiry: 'sessionExpiry',
  loginTime: 'loginTime',
} as const;

export async function saveAuthSession(data: {
  token: string;
  user: object;
  sessionExpiry?: string | number;
}) {
  await Promise.all([
    AsyncStorage.setItem(KEYS.token, data.token),
    AsyncStorage.setItem(KEYS.user, JSON.stringify(data.user)),
    AsyncStorage.setItem(KEYS.sessionExpiry, String(data.sessionExpiry ?? '')),
    AsyncStorage.setItem(KEYS.loginTime, Date.now().toString()),
  ]);
}

export async function clearAuthSession() {
  await Promise.all([
    AsyncStorage.removeItem(KEYS.token),
    AsyncStorage.removeItem(KEYS.user),
    AsyncStorage.removeItem(KEYS.sessionExpiry),
    AsyncStorage.removeItem(KEYS.loginTime),
  ]);
}

export async function getStoredToken() {
  return AsyncStorage.getItem(KEYS.token);
}

export async function getStoredUser<T = Record<string, unknown>>() {
  const raw = await AsyncStorage.getItem(KEYS.user);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}
