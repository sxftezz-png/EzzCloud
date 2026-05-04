import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module.js';
import { Session } from '../auth/entities/session.entity.js';
import { IndexingController } from './indexing.controller.js';
import { RecommendationsController } from './recommendations.controller.js';
import { TeiwazikController } from './teiwazik.controller.js';
import { TeiwazikService } from './teiwazik.service.js';

@Module({
  imports: [
    HttpModule.register({ timeout: 30_000 }),
    TypeOrmModule.forFeature([Session]),
    AuthModule,
  ],
  controllers: [TeiwazikController, RecommendationsController, IndexingController],
  providers: [TeiwazikService],
  exports: [TeiwazikService],
})
export class TeiwazikModule {}
