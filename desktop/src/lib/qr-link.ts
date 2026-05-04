import { api } from './api';

/**
 * QR-link API.
 *
 * Под капотом — обычный OAuth-флоу через /auth/login. В QR кодируется готовая
 * SoundCloud-ссылка на авторизацию: пользователь сканирует телефоном, проходит
 * вход в браузере, callback завершает сессию на бэке. Десктоп опрашивает
 * /auth/login/status и забирает sessionId.
 *
 * `mode` сохраняется для совместимости со старыми вызовами, фактически работает
 * только pull (десктоп без сессии получает sessionId после успешного входа).
 */

export interface CreateLinkResponse {
  linkRequestId: string;
  /** Готовая HTTPS-ссылка SoundCloud OAuth — кодируется в QR. */
  claimToken: string;
  expiresAt: string;
}

export interface LinkStatusResponse {
  status: 'pending' | 'claimed' | 'failed' | 'expired';
  mode: 'pull' | 'push';
  sessionId?: string;
  error?: string;
}

interface LoginResponse {
  url: string;
  loginRequestId: string;
}

interface LoginStatusResponse {
  status: 'pending' | 'completed' | 'failed' | 'expired';
  sessionId?: string;
  error?: string;
}

const QR_LINK_TTL_MS = 5 * 60 * 1000;

export async function createLinkRequest(_mode: 'pull' | 'push'): Promise<CreateLinkResponse> {
  const { url, loginRequestId } = await api<LoginResponse>('/auth/login');
  return {
    linkRequestId: loginRequestId,
    claimToken: url,
    expiresAt: new Date(Date.now() + QR_LINK_TTL_MS).toISOString(),
  };
}

export async function getLinkStatus(linkRequestId: string): Promise<LinkStatusResponse> {
  const data = await api<LoginStatusResponse>(
    `/auth/login/status?id=${encodeURIComponent(linkRequestId)}`,
  );
  if (data.status === 'completed') {
    return { status: 'claimed', mode: 'pull', sessionId: data.sessionId };
  }
  if (data.status === 'failed' || data.status === 'expired') {
    return { status: data.status, mode: 'pull', error: data.error };
  }
  return { status: 'pending', mode: 'pull' };
}

export function encodeQrPayload(claimToken: string, _mode: 'pull' | 'push'): string {
  return claimToken;
}
