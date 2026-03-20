import { IsString, IsNotEmpty, IsEmail, IsDateString, IsOptional } from 'class-validator';

export class CreateDriverDto {
  @IsString() @IsNotEmpty() name: string;
  @IsEmail() @IsNotEmpty() email: string;
  @IsString() @IsOptional() cnh?: string;
  @IsDateString() @IsOptional() cnh_validity?: string;
  @IsString() @IsOptional() cnh_category?: string;
}
