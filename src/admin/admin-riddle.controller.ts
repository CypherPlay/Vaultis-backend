import { Body, Controller, Post, Put, UseGuards, Param } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { AdminCreateRiddleDto } from './dto/admin-create-riddle.dto';
import { AdminUpdateRiddleDto } from './dto/admin-update-riddle.dto';
import { FinalizePrizeDto } from './dto/finalize-prize.dto';
import { AdminRiddleService } from './admin-riddle.service';

@UseGuards(AdminGuard)
@Controller('api/admin/riddle')
export class AdminRiddleController {
  constructor(
    private readonly adminRiddleService: AdminRiddleService,
  ) {}

  @Post()
  async createRiddle(@Body() createRiddleDto: AdminCreateRiddleDto) {
    return this.adminRiddleService.createRiddle(createRiddleDto);
  }

  @Put(':id')
  async updateRiddle(
    @Param('id') id: string,
    @Body() updateRiddleDto: AdminUpdateRiddleDto,
  ) {
    return this.adminRiddleService.updateRiddle(id, updateRiddleDto);
  }

  @Post(':id/finalize-prize')
  async finalizePrize(
    @Param('id') id: string,
    @Body() finalizePrizeDto: FinalizePrizeDto,
  ) {
    await this.adminRiddleService.finalizePrize(id, finalizePrizeDto);
    return { message: 'Riddle prize finalized successfully' };
  }
}
