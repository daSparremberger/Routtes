import { IsInt, IsNumber, IsEnum, IsUUID, IsOptional, Min } from 'class-validator';

export enum StopType {
  PICKUP = 'pickup',
  DROPOFF = 'dropoff',
  SCHOOL = 'school',
}

export class CreateStopDto {
  @IsInt()
  @Min(0)
  order: number;

  @IsUUID()
  @IsOptional()
  student_id?: string;

  @IsUUID()
  @IsOptional()
  school_id?: string;

  @IsNumber()
  lat: number;

  @IsNumber()
  lng: number;

  @IsEnum(StopType)
  stop_type: StopType;
}
