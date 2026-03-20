import { IsString, IsNotEmpty, IsNumber, IsEnum, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { SchoolType } from './create-school.dto';

export enum SchoolStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

export class UpdateSchoolDto {
  @IsString() @IsNotEmpty() @IsOptional() name?: string;
  @IsString() @IsOptional() address?: string;
  @Type(() => Number) @IsNumber() @IsOptional() lat?: number;
  @Type(() => Number) @IsNumber() @IsOptional() lng?: number;
  @IsEnum(SchoolType) @IsOptional() type?: SchoolType;
  @IsEnum(SchoolStatus) @IsOptional() status?: SchoolStatus;
}
