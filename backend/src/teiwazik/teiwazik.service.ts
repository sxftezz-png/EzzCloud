import { HttpService } from '@nestjs/axios';
import {
  BadGatewayException,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosError, AxiosResponse } from 'axios';
import { firstValueFrom } from 'rxjs';

const DEFAULT_TEIWAZIK_API_BASE = 'https://api.scdinternal.site';

@Injectable()
export class TeiwazikService {
  private readonly logger = new Logger(TeiwazikService.name);
  private readonly apiBase: string;

  constructor(
    private readonly httpService: HttpService,
    configService: ConfigService,
  ) {
    this.apiBase =
      configService.get<string>('teiwazik.apiBase') ||
      process.env.TEIWAZIK_API_BASE ||
      DEFAULT_TEIWAZIK_API_BASE;
  }

  get base() {
    return this.apiBase;
  }

  async getSession(teiwazikSessionId: string): Promise<{
    authenticated: boolean;
    sessionId?: string;
    username?: string;
    soundcloudUserId?: string;
  }> {
    return this.proxyJson('GET', '/auth/session', teiwazikSessionId);
  }

  async proxyJson<T = unknown>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string,
    teiwazikSessionId: string | null,
    options: { query?: Record<string, unknown>; body?: unknown } = {},
  ): Promise<T> {
    const headers: Record<string, string> = {
      Accept: 'application/json',
    };
    if (teiwazikSessionId) {
      headers['x-session-id'] = teiwazikSessionId;
    }
    if (options.body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }

    const url = new URL(`${this.apiBase}${path}`);
    if (options.query) {
      for (const [k, v] of Object.entries(options.query)) {
        if (v != null) url.searchParams.set(k, String(v));
      }
    }

    let response: AxiosResponse<T>;
    try {
      response = await firstValueFrom(
        this.httpService.request<T>({
          method,
          url: url.toString(),
          headers,
          data: options.body,
          validateStatus: () => true,
          timeout: 30_000,
        }),
      );
    } catch (error: unknown) {
      const ax = error as AxiosError;
      this.logger.warn(`Teiwazik ${method} ${path} failed: ${ax.message}`);
      throw new BadGatewayException(`Upstream Teiwazik request failed: ${ax.message}`);
    }

    if (response.status === 401 || response.status === 403) {
      throw new UnauthorizedException(
        (response.data as { message?: string })?.message || 'Teiwazik session invalid or expired',
      );
    }
    if (response.status >= 500) {
      throw new ServiceUnavailableException(`Teiwazik upstream returned ${response.status}`);
    }
    if (response.status >= 400) {
      throw new BadGatewayException(
        (response.data as { message?: string })?.message ||
          `Teiwazik upstream returned ${response.status}`,
      );
    }

    return response.data;
  }
}
