import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { LeaderboardService } from './leaderboard.service';
import { PaginationDto } from '../dto/pagination.dto';

@UseGuards(JwtAuthGuard)
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
