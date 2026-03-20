import { IsEmail, IsOptional } from 'class-validator';

export class CreateDriverInviteDto {
  @IsEmail() @IsOptional() email?: string;
}
