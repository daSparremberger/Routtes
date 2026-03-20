import { IsUUID, IsEnum } from 'class-validator';

export enum StopStatus {
  BOARDED = 'boarded',
  SKIPPED = 'skipped',
  ABSENT = 'absent',
}

export class RecordStopDto {
  @IsUUID()
  execution_stop_id: string;

  @IsEnum(StopStatus)
  status: StopStatus;
}
