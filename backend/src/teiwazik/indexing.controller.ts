import { Controller, Get, Headers, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Session } from '../auth/entities/session.entity.js';
import { AuthGuard } from '../common/guards/auth.guard.js';
import { TeiwazikService } from './teiwazik.service.js';

@ApiTags('indexing')
@ApiHeader({ name: 'x-session-id', required: true })
@UseGuards(AuthGuard)
@Controller('indexing')
export class IndexingController {
  constructor(
    @InjectRepository(Session) private readonly sessions: Repository<Session>,
    private readonly teiwazik: TeiwazikService,
  ) {}

  @Get('stats')
  @ApiOperation({ summary: 'SoundWave indexing stats (proxied to Teiwazik)' })
  async stats(
    @Headers('x-session-id') sessionId: string,
  ): Promise<{ indexed: number; pending: number } | null> {
    const session = await this.sessions.findOne({ where: { id: sessionId } });
    if (!session?.teiwazikSessionId) {
      return null;
    }
    try {
      return (await this.teiwazik.proxyJson(
        'GET',
        '/indexing/stats',
        session.teiwazikSessionId,
      )) as { indexed: number; pending: number };
    } catch {
      return null;
    }
  }
}
