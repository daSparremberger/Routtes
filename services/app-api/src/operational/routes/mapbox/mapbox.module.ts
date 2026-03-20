import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { MapboxService } from './mapbox.service';

@Module({
  imports: [HttpModule, ConfigModule],
  providers: [MapboxService],
  exports: [MapboxService],
})
export class MapboxModule {}
