import { Controller, Get, Query } from '@nestjs/common';
import { LeaderboardService } from './leaderboard.service';
import { PaginationDto } from '../dto/pagination.dto';
@Controller('leaderboard')
export class LeaderboardController {
  constructor(private readonly leaderboardService: LeaderboardService) {}

  @Get('daily')
  async getDailyLeaderboard() {
    return this.leaderboardService.getDailyRankings();
  }

  @Get('all-time')
  async getAllTimeLeaderboard(@Query() paginationDto: PaginationDto) {
    const { page, limit } = paginationDto;
    return this.leaderboardService.getAllTimeRankings(page, limit);
  }
}
