
import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('riddles')
export class RiddleController {
  @UseGuards(JwtAuthGuard)
  @Get('current')
  getCurrentRiddle(@Request() req) {
    return req.user; // For now, just return the user info from the JWT
  }
}
