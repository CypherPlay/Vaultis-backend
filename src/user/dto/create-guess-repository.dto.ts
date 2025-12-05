import { IsMongoId, IsNotEmpty, IsString, IsBoolean, IsOptional } from 'class-validator';

export class CreateGuessRepositoryDto {
  @IsMongoId()
  @IsNotEmpty()
  userId: string;

  @IsMongoId()
  @IsNotEmpty()
  riddleId: string;

  @IsString()
  @IsNotEmpty()
  guessText: string;

  @IsBoolean()
  @IsOptional()
  isCorrect?: boolean = false;
}
