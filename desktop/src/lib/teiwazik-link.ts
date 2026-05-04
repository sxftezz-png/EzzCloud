import { isTauri } from '@tauri-apps/api/core';
import { openUrl } from '@tauri-apps/plugin-opener';
import { api } from './api';

export interface TeiwazikLoginResponse {
  url: string;
  loginRequestId: string;
}

export interface TeiwazikLoginStatus {
  status: 'pending' | 'completed' | 'failed' | 'expired' | 'linked';
  step?: 'token' | 'profile' | 'session';
  username?: string;
  error?: string;
}

export interface TeiwazikStatus {
  configured: boolean;
  username?: string;
  soundcloudUserId?: string;
}

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 5 * 60 * 1000;

export async function checkTeiwazikStatus(): Promise<TeiwazikStatus> {
  return api<TeiwazikStatus>('/auth/teiwazik/status', { quietHttpErrors: true }).catch(() => ({
    configured: false,
  }));
}

export async function startTeiwazikLogin(): Promise<TeiwazikLoginResponse> {
  return api<TeiwazikLoginResponse>('/auth/teiwazik/login');
}

async function openInBrowser(url: string) {
  if (isTauri()) {
    try {
      await openUrl(url);
      return;
    } catch {
      /* fallthrough */
    }
  }
  window.open(url, '_blank', 'noopener,noreferrer');
}

/**
 * Drives the parallel Teiwazik OAuth flow.
 *
 * Returns:
 *  - 'linked': the user completed Teiwazik OAuth and our session now has teiwazikSessionId
 *  - 'failed' / 'expired': upstream reported a terminal failure
 *  - 'aborted': caller aborted via the AbortSignal
 *  - 'timeout': we polled for >5min without resolution
 */
export async function linkTeiwazik(
  opts: { signal?: AbortSignal; onUrl?: (url: string) => void } = {},
): Promise<'linked' | 'failed' | 'expired' | 'aborted' | 'timeout'> {
  const { signal, onUrl } = opts;

  if (signal?.aborted) return 'aborted';

  const { url, loginRequestId } = await startTeiwazikLogin();
  onUrl?.(url);
  await openInBrowser(url);

  const startedAt = Date.now();
  while (true) {
    if (signal?.aborted) return 'aborted';
    if (Date.now() - startedAt > POLL_TIMEOUT_MS) return 'timeout';

    await new Promise<void>((resolve) => {
      const t = setTimeout(resolve, POLL_INTERVAL_MS);
      signal?.addEventListener('abort', () => {
        clearTimeout(t);
        resolve();
      });
    });

    if (signal?.aborted) return 'aborted';

    let status: TeiwazikLoginStatus;
    try {
      status = await api<TeiwazikLoginStatus>(
        `/auth/teiwazik/login/status?id=${encodeURIComponent(loginRequestId)}`,
        { quietHttpErrors: true },
      );
    } catch {
      continue;
    }

    if (status.status === 'linked') return 'linked';
    if (status.status === 'failed') return 'failed';
    if (status.status === 'expired') return 'expired';
    // pending / completed-without-link → keep polling
  }
}
