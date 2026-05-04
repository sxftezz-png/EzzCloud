import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class TeiwazikExchangeDto {
  @ApiProperty({
    description:
      'Session id obtained from a successful Teiwazik OAuth flow at api.scdinternal.site',
    format: 'uuid',
  })
  @IsString()
  teiwazikSessionId: string;
}

export class TeiwazikStatusDto {
  @ApiProperty({ description: 'Whether a Teiwazik session is currently linked to this user' })
  configured: boolean;

  @ApiPropertyOptional({ description: 'Username reported by Teiwazik for the linked session' })
  username?: string;

  @ApiPropertyOptional({
    description: 'SoundCloud user URN reported by Teiwazik for the linked session',
  })
  soundcloudUserId?: string;
}

export class TeiwazikLoginResponseDto {
  @ApiProperty({ description: 'SoundCloud OAuth authorization URL for the Teiwazik account' })
  url: string;

  @ApiProperty({ description: 'Login request id, used for polling status', format: 'uuid' })
  loginRequestId: string;
}

export class TeiwazikLoginStatusDto {
  @ApiProperty({ enum: ['pending', 'completed', 'failed', 'expired', 'linked'] })
  status: 'pending' | 'completed' | 'failed' | 'expired' | 'linked';

  @ApiPropertyOptional()
  step?: 'token' | 'profile' | 'session';

  @ApiPropertyOptional()
  username?: string;

  @ApiPropertyOptional()
  error?: string;
}
