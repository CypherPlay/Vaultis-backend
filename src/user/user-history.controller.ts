import { Controller, Get, Req, UseGuards, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Request } from 'express';
import { PaginationDto } from '../dto/pagination.dto';
import { UserHistoryDto } from './dto/user-history.dto';
import { ApiBearerAuth, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('User')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('/api/user/history')
export class UserHistoryController {
  constructor() {}

  @Get()
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Limit the number of results' })
  @ApiQuery({ name: 'offset', required: false, type: Number, description: 'Offset the results by this number' })
  @ApiResponse({ status: 200, description: 'User history retrieved successfully', type: [UserHistoryDto] })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getUserHistory(
    @Req() req: Request,
    @Query() paginationDto: PaginationDto,
  ): Promise<UserHistoryDto[]> {
    // In a real application, you would fetch the user's history from a service
    // using req.user.id and paginationDto.limit, paginationDto.offset
    console.log(`User ${req.user['userId']} requested history with limit ${paginationDto.limit} and offset ${paginationDto.offset}`);
    return [];
  }
}
