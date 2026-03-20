import { IsString, Length } from 'class-validator';

export enum TenantStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  INACTIVE = 'inactive',
}

export class CreateTenantDto {
  @IsString()
  city: string;

  @IsString()
  @Length(2, 2)
  state: string;
}
