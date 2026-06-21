import { Platform } from 'react-native';
import ReactNativeBlobUtil from 'react-native-blob-util';
import { ensureApiReady, getAuthHeaders, getResolvedApiBaseUrl } from './apiClient';
import { resolveBackendFileUrl } from './proofSubmissionService';

export type DocumentOpenOptions = {
  fileName?: string | null;
  mimeType?: string | null;
  urls?: string[];
};

function sanitizeDocumentFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
}

function normalizeDocumentPath(fileUrl: string) {
  if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
    try {
      const parsed = new URL(fileUrl);
      return parsed.pathname;
    } catch {
      return fileUrl;
    }
  }
  return fileUrl.startsWith('/') ? fileUrl : `/${fileUrl}`;
}

export function getDocumentExtension(
  fileName?: string | null,
  mimeType?: string | null,
) {
  if (fileName?.includes('.')) {
    return fileName.split('.').pop()!.toLowerCase();
  }
  const mimeMap: Record<string, string> = {
    'application/pdf': 'pdf',
    'application/msword': 'doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/vnd.ms-excel': 'xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
    'application/vnd.ms-powerpoint': 'ppt',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
    'text/plain': 'txt',
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'application/zip': 'zip',
    'application/x-zip-compressed': 'zip',
    'application/x-rar-compressed': 'rar',
  };
  return mimeMap[mimeType ?? ''] ?? 'bin';
}

export function getDocumentMimeType(
  fileName?: string | null,
  mimeType?: string | null,
) {
  if (mimeType && mimeType.includes('/')) {
    return mimeType;
  }
  const ext = getDocumentExtension(fileName, mimeType);
  const extMap: Record<string, string> = {
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    txt: 'text/plain',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    zip: 'application/zip',
    rar: 'application/x-rar-compressed',
  };
  return extMap[ext] ?? 'application/octet-stream';
}

export function getDocumentFetchUrls(fileUrl: string, extraUrls: string[] = []) {
  const resolved = resolveBackendFileUrl(fileUrl);
  const path = normalizeDocumentPath(fileUrl);
  const base = getResolvedApiBaseUrl().replace(/\/$/, '');
  const proxyUrl = `${base}/api/messages/file?path=${encodeURIComponent(path)}`;
  const urls = [...extraUrls, resolved, proxyUrl];
  return urls.filter((value, index, list) => value && list.indexOf(value) === index);
}

async function fetchDocumentWithUrl(
  url: string,
  fileName: string | null | undefined,
  mimeType: string | null | undefined,
  mode: 'open' | 'download',
) {
  const ext = getDocumentExtension(fileName, mimeType);
  const mime = getDocumentMimeType(fileName, mimeType);
  const safeName = sanitizeDocumentFileName(fileName ?? `document.${ext}`);
  const authHeaders = (await getAuthHeaders()) as Record<string, string>;

  if (mode === 'download' && Platform.OS === 'android') {
    const response = await ReactNativeBlobUtil.config({
      fileCache: true,
      path: `${ReactNativeBlobUtil.fs.dirs.DownloadDir}/${Date.now()}_${safeName}`,
      addAndroidDownloads: {
        useDownloadManager: true,
        notification: true,
        title: safeName,
        description: 'Document download',
        mime,
        mediaScannable: true,
      },
    }).fetch('GET', url, authHeaders);

    const status = response.info().status;
    if (status < 200 || status >= 300) {
      throw new Error(String(status));
    }
    return null;
  }

  const response = await ReactNativeBlobUtil.config({
    fileCache: true,
    appendExt: ext,
  }).fetch('GET', url, authHeaders);

  const status = response.info().status;
  if (status < 200 || status >= 300) {
    throw new Error(String(status));
  }

  const localPath = response.path();
  const exists = await ReactNativeBlobUtil.fs.exists(localPath);
  if (!exists) {
    throw new Error('missing');
  }

  if (mode === 'download') {
    const destDir = ReactNativeBlobUtil.fs.dirs.DownloadDir;
    const destPath = `${destDir}/${Date.now()}_${safeName}`;
    await ReactNativeBlobUtil.fs.cp(localPath, destPath);
    return destPath;
  }

  return localPath;
}

export async function fetchDocumentToDevice(
  fileUrl: string,
  fileName?: string | null,
  mimeType?: string | null,
  mode: 'open' | 'download' = 'open',
  extraUrls: string[] = [],
) {
  await ensureApiReady();

  const urls = getDocumentFetchUrls(fileUrl, extraUrls);
  let lastError: Error | null = null;

  for (const url of urls) {
    try {
      return await fetchDocumentWithUrl(url, fileName, mimeType, mode);
    } catch (err) {
      const code = err instanceof Error ? err.message : 'unknown';
      lastError = new Error(code);
    }
  }

  if (lastError?.message === '404') {
    throw new Error('File not found on server. It may have expired after a server restart.');
  }
  throw new Error('Could not download file. Check your internet connection.');
}

async function openLocalDocument(path: string, mime: string) {
  if (Platform.OS === 'android') {
    try {
      await ReactNativeBlobUtil.android.actionViewIntent(path, mime);
    } catch {
      await ReactNativeBlobUtil.android.actionViewIntent(path, '*/*');
    }
    return;
  }
  await ReactNativeBlobUtil.ios.openDocument(path);
}

export async function openDocumentFromUrl(
  fileUrl?: string | null,
  options: DocumentOpenOptions = {},
) {
  if (!fileUrl) {
    throw new Error('No file attached');
  }

  const path = await fetchDocumentToDevice(
    fileUrl,
    options.fileName,
    options.mimeType,
    'open',
    options.urls ?? [],
  );
  if (!path) {
    return;
  }

  const mime = getDocumentMimeType(options.fileName, options.mimeType);
  await openLocalDocument(path, mime);
}

export async function downloadDocumentFromUrl(
  fileUrl?: string | null,
  options: DocumentOpenOptions = {},
) {
  if (!fileUrl) {
    throw new Error('No file attached');
  }

  const path = await fetchDocumentToDevice(
    fileUrl,
    options.fileName,
    options.mimeType,
    'download',
    options.urls ?? [],
  );

  if (Platform.OS === 'android') {
    return;
  }
  if (path) {
    await ReactNativeBlobUtil.ios.openDocument(path);
  }
}
