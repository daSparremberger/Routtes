import { IsArray, IsDateString, IsInt, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateContractDto {
  @IsUUID()
  organizationId: string;

  @IsNumber()
  @Type(() => Number)
  monthlyValue: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  modules?: string[];

  @IsInt()
  @Min(0)
  maxVehicles: number;

  @IsInt()
  @Min(0)
  maxDrivers: number;

  @IsInt()
  @Min(0)
  maxManagers: number;

  @IsDateString()
  startsAt: string;

  @IsOptional()
  @IsDateString()
  endsAt?: string;
}
