import { IsInt, IsOptional, Min } from 'class-validator';

export class UpdateLicenseDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  maxVehicles?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxDrivers?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxManagers?: number;
}
