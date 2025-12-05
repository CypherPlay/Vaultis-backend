import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiResponse, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UserHistoryService } from './user-history.service';
import { UserGuessHistoryDto } from './dto/user-history.dto';
import { Request } from 'express';

@ApiTags('User History')
@Controller('user/history')
export class UserHistoryController {
  constructor(private readonly userHistoryService: UserHistoryService) {}

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('guesses')
  @ApiOperation({ summary: 'Get user\'s guess history' })
  @ApiResponse({ status: 200, description: 'User guess history retrieved successfully', type: [UserGuessHistoryDto] })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getUserGuessHistory(@Req() req: Request): Promise<UserGuessHistoryDto[]> {
    const userId = req.user['userId'];
    return this.userHistoryService.getUserGuessHistory(userId);
  }
}

