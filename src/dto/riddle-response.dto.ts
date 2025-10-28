import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';

enum RiddleDifficulty {
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard',
}

enum RiddleCategory {
  PROGRAMMING = 'programming',
  LOGIC = 'logic',
  MATH = 'math',
  GENERAL = 'general',
}

export class RiddleResponseDto {
  @ApiProperty({
    description: 'The unique identifier of the riddle',
    example: '654321098765432109876543',
  })
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty({
    description: 'The question of the riddle',
    example: 'I have cities, but no houses; forests, but no trees; and water, but no fish. What am I?',
  })
  @IsString()
  @IsNotEmpty()
  question: string;

  @ApiProperty({
    description: 'The difficulty level of the riddle',
    enum: RiddleDifficulty,
    example: RiddleDifficulty.EASY,
  })
  @IsEnum(RiddleDifficulty)
  @IsNotEmpty()
  difficulty: RiddleDifficulty;

  @ApiProperty({
    description: 'The category of the riddle',
    enum: RiddleCategory,
    example: RiddleCategory.LOGIC,
  })
  @IsEnum(RiddleCategory)
  @IsNotEmpty()
  category: RiddleCategory;
}
