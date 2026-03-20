import { IsString, IsEmail, IsDateString, IsOptional, IsEnum } from 'class-validator';

export enum DriverStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

export class UpdateDriverDto {
  @IsString() @IsOptional() name?: string;
  @IsEmail() @IsOptional() email?: string;
  @IsString() @IsOptional() cnh?: string;
  @IsDateString() @IsOptional() cnh_validity?: string;
  @IsString() @IsOptional() cnh_category?: string;
  @IsEnum(DriverStatus) @IsOptional() status?: DriverStatus;
}
