import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsNumber,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Shift } from '../../schools/dto/create-schedule.dto';

export class CreateStudentDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  school_id: string;

  @IsEnum(Shift)
  shift: Shift;

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
}
