import { IsEmail, IsObject, IsOptional, IsString } from 'class-validator';

export class UpdateOrganizationDto {
  @IsOptional()
  @IsString()
  razaoSocial?: string;

  @IsOptional()
  @IsString()
  cnpj?: string;

  @IsOptional()
  @IsEmail()
  financialEmail?: string;

  @IsOptional()
  @IsObject()
  billingAddress?: Record<string, unknown>;
}
