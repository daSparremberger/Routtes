import { Module } from '@nestjs/common';
import { RoutesController } from './routes.controller';
import { RoutesService } from './routes.service';
import { MapboxModule } from './mapbox/mapbox.module';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule, MapboxModule],
  controllers: [RoutesController],
  providers: [RoutesService],
  exports: [RoutesService],
})
export class RoutesModule {}
