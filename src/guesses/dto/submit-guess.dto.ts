import { IsString, IsNotEmpty } from 'class-validator';

export class SubmitGuessDto {
  @IsString()
  @IsNotEmpty()
  riddleId: string;

  @IsString()
  @IsNotEmpty()
  guess: string;
}
