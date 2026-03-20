import { IsEnum, IsString, IsNumber, IsOptional } from 'class-validator';

export enum RouteEventType {
  DELAY = 'delay',
  DETOUR = 'detour',
  MECHANICAL = 'mechanical',
  OBSERVATION = 'observation',
  OTHER = 'other',
}

export class AddRouteEventDto {
  @IsEnum(RouteEventType)
  type: RouteEventType;

  @IsString()
  description: string;

  @IsNumber()
  @IsOptional()
  lat?: number;

  @IsNumber()
  @IsOptional()
  lng?: number;
}
