import { IsString, IsNotEmpty, IsNumber, IsEnum, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export enum SchoolType {
  SCHOOL = 'school',
  SERVICE_POINT = 'service_point',
}

export class CreateSchoolDto {
  @IsString() @IsNotEmpty() name: string;
  @IsString() @IsOptional() address?: string;
  @Type(() => Number) @IsNumber() @IsOptional() lat?: number;
  @Type(() => Number) @IsNumber() @IsOptional() lng?: number;
  @IsEnum(SchoolType) type: SchoolType;
}
