import { IsEnum, IsOptional, IsString, Length } from 'class-validator';
import { TenantStatus } from './create-tenant.dto';

export class UpdateTenantDto {
  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  @Length(2, 2)
  state?: string;

  @IsOptional()
  @IsEnum(TenantStatus)
  status?: TenantStatus;
}
