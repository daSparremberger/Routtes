import { IsEmail, IsObject, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateOrganizationDto {
  @IsUUID()
  tenantId: string;

  @IsString()
  razaoSocial: string;

  @IsString()
  cnpj: string;

  @IsEmail()
  financialEmail: string;

  @IsOptional()
  @IsObject()
  billingAddress?: Record<string, unknown>;
}
