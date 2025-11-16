import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class LeaderboardEntryDto {
  @Expose()
  @ApiProperty({ description: 'The rank of the user in the leaderboard' })
  rank: number;

  @Expose()
  @ApiProperty({ description: 'The ID of the user' })
  userId: string;

  @Expose()
  @ApiProperty({ description: 'The username of the user' })
  username: string;

  @Expose()
  @ApiProperty({ description: 'The total winnings of the user' })
  totalWinnings: number;

  @Expose()
  @ApiProperty({ description: 'The submission time of the user's last winning guess' })
  submissionTime: Date;
}
