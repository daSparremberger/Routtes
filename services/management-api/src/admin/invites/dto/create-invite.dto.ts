import { IsEmail, IsOptional, IsUUID } from 'class-validator';

export class CreateInviteDto {
  @IsUUID() tenantId: string;
  @IsOptional() @IsEmail() email?: string;
}
