import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class UpdateDeviceTokenDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  token: string;
}
