import { ApiProperty } from '@nestjs/swagger';

export class UserGuessHistoryDto {
  @ApiProperty({ description: 'The ID of the guess' })
  guessId: string;

  @ApiProperty({ description: 'The ID of the riddle' })
  riddleId: string;

  @ApiProperty({ description: 'The title of the riddle' })
  riddleTitle: string;

  @ApiProperty({ description: 'The result of the guess (Correct/Incorrect)' })
  guessResult: string;

  @ApiProperty({ description: 'The time the guess was attempted' })
  attemptTime: Date;

  @ApiProperty({ description: 'The user's guess' })
  userGuess: string;
}