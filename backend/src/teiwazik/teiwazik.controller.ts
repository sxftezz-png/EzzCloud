import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiHeader, ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Session } from '../auth/entities/session.entity.js';
import { AuthGuard } from '../common/guards/auth.guard.js';
import {
  TeiwazikExchangeDto,
  TeiwazikLoginResponseDto,
  TeiwazikLoginStatusDto,
  TeiwazikStatusDto,
} from './dto/teiwazik.dto.js';
import { TeiwazikService } from './teiwazik.service.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Endpoints used by the desktop client to link the user's account to an
 * api.scdinternal.site (Teiwazik) session, which powers SoundWave / recommendations.
 *
 * The client drives the Teiwazik OAuth flow itself (calls api.scdinternal.site/auth/login,
 * opens browser, polls api.scdinternal.site/auth/login/status). Once the user is
 * authenticated there, the client posts the resulting Teiwazik session id here so
 * we can use it to proxy /recommendations* and /indexing/stats requests.
 */
@ApiTags('teiwazik')
@ApiHeader({ name: 'x-session-id', required: true })
@UseGuards(AuthGuard)
@Controller('auth/teiwazik')
export class TeiwazikController {
  constructor(
    @InjectRepository(Session) private readonly sessions: Repository<Session>,
    private readonly teiwazik: TeiwazikService,
  ) {}

  @Get('status')
  @ApiOperation({ summary: 'Whether the current user has a linked Teiwazik session' })
  @ApiOkResponse({ type: TeiwazikStatusDto })
  async status(@Headers('x-session-id') sessionId: string): Promise<TeiwazikStatusDto> {
    const session = await this.sessions.findOne({ where: { id: sessionId } });
    if (!session?.teiwazikSessionId) {
      return { configured: false };
    }

    try {
      const upstream = await this.teiwazik.getSession(session.teiwazikSessionId);
      if (!upstream.authenticated) {
        return { configured: false };
      }
      return {
        configured: true,
        username: upstream.username,
        soundcloudUserId: upstream.soundcloudUserId,
      };
    } catch {
      return { configured: false };
    }
  }

  @Post('exchange')
  @HttpCode(200)
  @ApiOperation({ summary: 'Link a Teiwazik session id obtained from the client-side OAuth flow' })
  @ApiOkResponse({ type: TeiwazikStatusDto })
  async exchange(
    @Headers('x-session-id') sessionId: string,
    @Body() body: TeiwazikExchangeDto,
  ): Promise<TeiwazikStatusDto> {
    if (!UUID_REGEX.test(body.teiwazikSessionId)) {
      throw new BadRequestException('teiwazikSessionId must be a UUID');
    }

    const upstream = await this.teiwazik.getSession(body.teiwazikSessionId);
    if (!upstream.authenticated) {
      throw new BadRequestException('Teiwazik session is not authenticated');
    }

    await this.sessions.update({ id: sessionId }, { teiwazikSessionId: body.teiwazikSessionId });

    return {
      configured: true,
      username: upstream.username,
      soundcloudUserId: upstream.soundcloudUserId,
    };
  }

  @Delete('exchange')
  @ApiOperation({ summary: 'Unlink the Teiwazik session for the current user' })
  @ApiOkResponse({ type: TeiwazikStatusDto })
  async clear(@Headers('x-session-id') sessionId: string): Promise<TeiwazikStatusDto> {
    await this.sessions.update({ id: sessionId }, { teiwazikSessionId: null as unknown as string });
    return { configured: false };
  }

  @Get('login')
  @ApiOperation({
    summary: 'Initiate the Teiwazik OAuth flow (server-side proxy to api.scdinternal.site)',
  })
  @ApiOkResponse({ type: TeiwazikLoginResponseDto })
  async initiateLogin(): Promise<TeiwazikLoginResponseDto> {
    return this.teiwazik.proxyJson<TeiwazikLoginResponseDto>('GET', '/auth/login', null);
  }

  @Get('login/status')
  @ApiOperation({
    summary: 'Poll the Teiwazik OAuth flow; on completion, link sessionId to current user',
  })
  @ApiQuery({ name: 'id', required: true })
  @ApiOkResponse({ type: TeiwazikLoginStatusDto })
  async loginStatus(
    @Headers('x-session-id') sessionId: string,
    @Query('id') id: string,
  ): Promise<TeiwazikLoginStatusDto> {
    const upstream = await this.teiwazik.proxyJson<{
      status: 'pending' | 'completed' | 'failed' | 'expired';
      step?: 'token' | 'profile' | 'session';
      sessionId?: string;
      username?: string;
      error?: string;
    }>('GET', '/auth/login/status', null, { query: { id } });

    if (upstream.status === 'completed' && upstream.sessionId) {
      await this.sessions.update({ id: sessionId }, { teiwazikSessionId: upstream.sessionId });
      return {
        status: 'linked',
        username: upstream.username,
      };
    }

    return {
      status: upstream.status,
      step: upstream.step,
      username: upstream.username,
      error: upstream.error,
    };
  }
}
