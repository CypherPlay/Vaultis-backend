import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RiddleManagerService } from './riddle-manager.service';

@Controller('riddles')
export class RiddleController {
  constructor(private readonly riddleManagerService: RiddleManagerService) {}

  @UseGuards(JwtAuthGuard)
  @Get('current')
  async getCurrentRiddle() {
    return this.riddleManagerService.getActiveRiddle();
  }
}
