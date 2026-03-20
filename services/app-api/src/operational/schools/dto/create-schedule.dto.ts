import { IsEnum, IsString, Matches } from 'class-validator';

export enum Shift {
  MORNING = 'morning',
  AFTERNOON = 'afternoon',
  EVENING = 'evening',
}

export class CreateScheduleDto {
  @IsEnum(Shift) shift: Shift;
  @IsString() @Matches(/^\d{2}:\d{2}$/, { message: 'entry_time must be HH:MM' }) entry_time: string;
  @IsString() @Matches(/^\d{2}:\d{2}$/, { message: 'exit_time must be HH:MM' }) exit_time: string;
}
