import { Controller, Get } from '@nestjs/common';
import { LeaderboardService } from './leaderboard.service';

@Controller('leaderboard')
export class LeaderboardController {
  constructor(private readonly leaderboardService: LeaderboardService) {}

  @Get('daily')
  async getDailyLeaderboard() {
    return this.leaderboardService.getDailyRankings();
  }
}
