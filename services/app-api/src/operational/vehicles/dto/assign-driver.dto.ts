import { IsString, IsNotEmpty } from 'class-validator';

export class AssignDriverDto {
  @IsString()
  @IsNotEmpty()
  driver_user_id: string;
}
