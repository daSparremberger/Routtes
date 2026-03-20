import { PartialType } from '@nestjs/mapped-types';
import { CreateRouteDto } from './create-route.dto';
import { IsEnum, IsOptional } from 'class-validator';

export enum RouteStatus {
  DRAFT = 'draft',
  APPROVED = 'approved',
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

export class UpdateRouteDto extends PartialType(CreateRouteDto) {
  @IsEnum(RouteStatus)
  @IsOptional()
  status?: RouteStatus;
}
