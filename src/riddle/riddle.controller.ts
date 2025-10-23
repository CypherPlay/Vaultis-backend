
import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RiddleService } from './riddle.service';

@Controller('riddles')
export class RiddleController {
  constructor(private readonly riddleService: RiddleService) {}

  @UseGuards(JwtAuthGuard)
  @Get('current')
  async getCurrentRiddle() {
    return this.riddleService.findCurrentRiddle();
  }
}
