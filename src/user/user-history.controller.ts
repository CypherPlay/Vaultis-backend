import { Controller, Get, Req, UseGuards, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Request } from 'express';
import { PaginationDto } from '../dto/pagination.dto';
import { UserHistoryDto } from './dto/user-history.dto';
import { ApiBearerAuth, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { LoggerService } from '../logger/logger.service';

@ApiTags('User')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('/api/user/history')
export class UserHistoryController {
  constructor(private readonly logger: LoggerService) {}

  @Get()
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Limit the number of results' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number for the results' })
  @ApiResponse({ status: 200, description: 'User history retrieved successfully', type: [UserHistoryDto] })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getUserHistory(
    @Req() req: Request,
    @Query() paginationDto: PaginationDto,
  ): Promise<UserHistoryDto[]> {
    // In a real application, you would fetch the user's history from a service
    // using req.user.id and paginationDto.limit, paginationDto.offset
    this.logger.log(`User ${req.user['userId']} requested history with limit ${paginationDto.limit} and page ${paginationDto.page}`);
    return [];
  }
}
