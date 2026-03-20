import { IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class SyncLicenseDto {
  @IsUUID()
  tenantId: string;

  @IsInt()
  @Min(0)
  maxVehicles: number;

  @IsInt()
  @Min(0)
  maxDrivers: number;

  @IsInt()
  @Min(0)
  maxManagers: number;

  @IsOptional()
  @IsString()
  @IsUUID()
  contractId?: string;
}
