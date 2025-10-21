
import { Controller, Post, UseGuards, Request, Body } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('guesses')
export class GuessController {
  @UseGuards(JwtAuthGuard)
  @Post()
  submitGuess(@Request() req, @Body() body) {
    return { user: req.user, guess: body.guess }; // For now, just return user and guess
  }
}
