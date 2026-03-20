import { IsString, IsNotEmpty, IsEmail, IsOptional } from 'class-validator';

export class CreateContactDto {
  @IsString() @IsNotEmpty() name: string;
  @IsString() @IsOptional() role?: string;
  @IsString() @IsOptional() phone?: string;
  @IsEmail() @IsOptional() email?: string;
}
