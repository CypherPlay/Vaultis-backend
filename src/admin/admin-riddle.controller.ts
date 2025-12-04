import { Body, Controller, Post, Put, UseGuards, Param, NotFoundException } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { AdminCreateRiddleDto } from './dto/admin-create-riddle.dto';
import { AdminUpdateRiddleDto } from './dto/admin-update-riddle.dto';
import { RiddleService } from '../riddle/riddle.service';
import { RiddleManagerService } from '../riddle/riddle-manager.service';

@UseGuards(AdminGuard)
@Controller('api/admin/riddle')
export class AdminRiddleController {
  constructor(
    private readonly riddleService: RiddleService,
    private readonly riddleManagerService: RiddleManagerService,
  ) {}

  @Post()
  async createRiddle(@Body() createRiddleDto: AdminCreateRiddleDto) {
    return this.riddleService.createRiddle(createRiddleDto);
  }

  @Put(':id')
  async updateRiddle(
    @Param('id') id: string,
    @Body() updateRiddleDto: AdminUpdateRiddleDto,
  ) {
    const updatedRiddle = await this.riddleService.updateRiddle(id, updateRiddleDto);
    if (!updatedRiddle) {
      throw new NotFoundException(`Riddle with ID ${id} not found`);
    }
    return updatedRiddle;
  }

  @Post(':id/finalize-prize')
  async finalizePrize(@Param('id') id: string) {
    await this.riddleManagerService.finalizeRiddlePrize(id);
    return { message: 'Riddle prize finalized successfully' };
  }
}
