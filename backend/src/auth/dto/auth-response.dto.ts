import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Configuration for SoundCloud API credentials
 */
export class SetCredentialsDto {
  @ApiProperty({ description: 'SoundCloud Client ID' })
  clientId: string;

  @ApiProperty({ description: 'SoundCloud Client Secret' })
  clientSecret: string;

  @ApiPropertyOptional({ description: 'OAuth Redirect URI' })
  redirectUri?: string;
}

/**
 * Initial login response providing the OAuth URL
 */
export class LoginResponseDto {
  @ApiProperty({ description: 'SoundCloud OAuth authorization URL' })
  url: string;

  @ApiProperty({ description: 'Session ID to use for subsequent requests', format: 'uuid' })
  sessionId: string;

  @ApiProperty({
    description:
      'Pending login request id used for /auth/login/status polling (alias of sessionId)',
    format: 'uuid',
  })
  loginRequestId: string;
}

/**
 * Status of a pending OAuth login (used while user is still in the browser tab)
 */
export class LoginStatusResponseDto {
  @ApiProperty({ enum: ['pending', 'completed', 'failed', 'expired'] })
  status: 'pending' | 'completed' | 'failed' | 'expired';

  @ApiPropertyOptional({
    description: 'Authenticated session id (only on status=completed)',
    format: 'uuid',
  })
  sessionId?: string;

  @ApiPropertyOptional({ description: 'SoundCloud username (only on status=completed)' })
  username?: string;

  @ApiPropertyOptional({ description: 'Error message (only on status=failed/expired)' })
  error?: string;
}

/**
 * Current session state and user information
 */
export class SessionResponseDto {
  @ApiProperty()
  authenticated: boolean;

  @ApiPropertyOptional({ format: 'uuid' })
  sessionId?: string;

  @ApiPropertyOptional()
  username?: string;

  @ApiPropertyOptional()
  soundcloudUserId?: string;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  expiresAt?: Date;
}

/**
 * Response after refreshing an expired session
 */
export class RefreshResponseDto {
  @ApiProperty({ format: 'uuid' })
  sessionId: string;

  @ApiProperty({ type: String, format: 'date-time' })
  expiresAt: Date;
}

/**
 * Standard logout confirmation
 */
export class LogoutResponseDto {
  @ApiProperty()
  success: boolean;
}
