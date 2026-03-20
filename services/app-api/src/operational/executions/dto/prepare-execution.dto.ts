import { IsUUID, IsDateString, IsEnum } from 'class-validator';
import { AttendanceDirection } from '../../attendance/dto/upsert-attendance.dto';

export class PrepareExecutionDto {
  @IsUUID()
  route_id: string;

  @IsUUID()
  driver_id: string;

  @IsUUID()
  vehicle_id: string;

  @IsDateString()
  service_date: string;

  @IsEnum(AttendanceDirection)
  direction: AttendanceDirection;
}
