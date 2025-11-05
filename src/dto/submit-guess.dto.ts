import { IsNotEmpty, IsString, IsOptional, IsMongoId } from 'class-validator';

export class SubmitGuessDto {
  @IsMongoId()
  @IsNotEmpty()
  riddleId: string;

  @IsString()
  @IsNotEmpty()
  guessText: string;

  @IsString()
  @IsOptional()
  retryToken?: string;
}
