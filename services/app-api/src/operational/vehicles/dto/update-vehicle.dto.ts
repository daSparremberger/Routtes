import { IsString, IsInt, IsOptional, Min, IsEnum } from 'class-validator';

export enum VehicleStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

export class UpdateVehicleDto {
  @IsString()
  @IsOptional()
  plate?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  capacity?: number;

  @IsString()
  @IsOptional()
  model?: string;

  @IsString()
  @IsOptional()
  totem_id?: string;

  @IsEnum(VehicleStatus)
  @IsOptional()
  status?: VehicleStatus;
}
