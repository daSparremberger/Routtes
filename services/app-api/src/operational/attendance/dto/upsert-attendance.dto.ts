import { IsUUID, IsEnum, IsDateString } from 'class-validator';

export enum AttendanceDirection {
  OUTBOUND = 'outbound',
  INBOUND = 'inbound',
}

export enum AttendanceDecision {
  YES = 'yes',
  NO = 'no',
  NO_RESPONSE = 'no_response',
}

export enum AttendanceSource {
  GUARDIAN = 'guardian',
  MANAGER = 'manager',
  API = 'api',
}

export class UpsertAttendanceDto {
  @IsUUID()
  student_id: string;

  @IsUUID()
  route_id: string;

  @IsDateString()
  service_date: string;

  @IsEnum(AttendanceDirection)
  direction: AttendanceDirection;

  @IsEnum(AttendanceDecision)
  decision: AttendanceDecision;

  @IsEnum(AttendanceSource)
  source: AttendanceSource;
}
