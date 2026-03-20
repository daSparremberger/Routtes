import { IsUUID, IsNumber } from 'class-validator';

export class LocationUpdateDto {
  @IsUUID()
  executionId: string;

  @IsNumber()
  lat: number;

  @IsNumber()
  lng: number;
}
