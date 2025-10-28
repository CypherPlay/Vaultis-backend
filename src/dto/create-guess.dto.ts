import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateGuessDto {
  @ApiProperty({
    description: 'The ID of the riddle being guessed',
    example: '654321098765432109876543',
  })
  @IsString()
  @IsNotEmpty()
  riddleId: string;

  @ApiProperty({
    description: 'The user's guess for the riddle',
    example: 'My guess is...',
  })
  @IsString()
  @IsNotEmpty()
  guess: string;
}
