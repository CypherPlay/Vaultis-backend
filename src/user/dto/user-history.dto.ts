import { ApiProperty } from '@nestjs/swagger';

export class UserHistoryDto {
  @ApiProperty({ description: 'The ID of the user' })
  userId: string;

  @ApiProperty({ description: 'The action performed' })
  action: string;

  @ApiProperty({ description: 'The timestamp of the action' })
  timestamp: Date;
}
