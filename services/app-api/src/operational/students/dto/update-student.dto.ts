import { IsString, IsEnum, IsOptional, IsNumber, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { Shift } from '../../schools/dto/create-schedule.dto';

export enum StudentStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

export class UpdateStudentDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  school_id?: string;

  @IsEnum(Shift)
  @IsOptional()
  shift?: Shift;

  @IsString()
  @IsOptional()
  class_name?: string;

  @IsString()
  @IsOptional()
  special_needs?: string;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  monthly_value?: number;

  @IsDateString()
  @IsOptional()
  contract_start?: string;

  @IsEnum(StudentStatus)
  @IsOptional()
  status?: StudentStatus;
}
