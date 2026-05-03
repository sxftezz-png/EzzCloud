import { Controller, Get, Headers, Param, Query, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Session } from '../auth/entities/session.entity.js';
import { AuthGuard } from '../common/guards/auth.guard.js';
import { TeiwazikService } from './teiwazik.service.js';

/**
 * Proxies all /recommendations* endpoints to api.scdinternal.site using the
 * Teiwazik session linked to the current user.
 *
 * Requires both:
 *  - a valid local x-session-id (handled by AuthGuard)
 *  - a linked Teiwazik session (set via /auth/teiwazik/exchange)
 *
 * If the user hasn't linked Teiwazik yet we return an empty array so the
 * frontend (which calls these endpoints with `.catch(() => [])`) hides the
 * SoundWave UI gracefully instead of throwing red errors.
 */
@ApiTags('recommendations')
@ApiHeader({ name: 'x-session-id', required: true })
@UseGuards(AuthGuard)
@Controller('recommendations')
export class RecommendationsController {
  constructor(
    @InjectRepository(Session) private readonly sessions: Repository<Session>,
    private readonly teiwazik: TeiwazikService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Personalised SoundWave feed (taste-based)' })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'mode', required: false, enum: ['similar', 'diverse'] })
  @ApiQuery({ name: 'languages', required: false })
  feed(
    @Headers('x-session-id') sessionId: string,
    @Query() query: Record<string, unknown>,
  ): Promise<unknown> {
    return this.proxy(sessionId, '/recommendations', query);
  }

  @Get('search')
  @ApiOperation({ summary: 'Text/vibe search across the SoundWave index (MuQ-MuLan)' })
  @ApiQuery({ name: 'q', required: true })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'languages', required: false })
  search(
    @Headers('x-session-id') sessionId: string,
    @Query() query: Record<string, unknown>,
  ): Promise<unknown> {
    return this.proxy(sessionId, '/recommendations/search', query);
  }

  @Get('similar/:trackId')
  @ApiOperation({ summary: 'Tracks similar to a given track id (no taste signal)' })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'diversity', required: false })
  similar(
    @Headers('x-session-id') sessionId: string,
    @Param('trackId') trackId: string,
    @Query() query: Record<string, unknown>,
  ): Promise<unknown> {
    return this.proxy(sessionId, `/recommendations/similar/${encodeURIComponent(trackId)}`, query);
  }

  @Get('wave/:seedTrackId')
  @ApiOperation({ summary: 'Infinite SoundWave tail seeded by the currently playing track' })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'mode', required: false, enum: ['similar', 'diverse'] })
  @ApiQuery({ name: 'languages', required: false })
  wave(
    @Headers('x-session-id') sessionId: string,
    @Param('seedTrackId') seedTrackId: string,
    @Query() query: Record<string, unknown>,
  ): Promise<unknown> {
    return this.proxy(sessionId, `/recommendations/wave/${encodeURIComponent(seedTrackId)}`, query);
  }

  private async proxy(
    sessionId: string,
    path: string,
    query: Record<string, unknown>,
  ): Promise<unknown> {
    const session = await this.sessions.findOne({ where: { id: sessionId } });
    if (!session?.teiwazikSessionId) {
      return [];
    }
    try {
      return await this.teiwazik.proxyJson('GET', path, session.teiwazikSessionId, { query });
    } catch {
      return [];
    }
  }
}
