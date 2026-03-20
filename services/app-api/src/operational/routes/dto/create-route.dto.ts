import { IsString, IsNotEmpty, IsEnum, IsUUID, IsOptional } from 'class-validator';

export enum RouteShift {
  MORNING = 'morning',
  AFTERNOON = 'afternoon',
  EVENING = 'evening',
}

export enum RouteType {
  FIXED = 'fixed',
  VARIABLE = 'variable',
}

export class CreateRouteDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(RouteShift)
  shift: RouteShift;

  @IsUUID()
  driver_id: string;

  @IsUUID()
  vehicle_id: string;

  @IsEnum(RouteType)
  @IsOptional()
  route_type?: RouteType;
}
