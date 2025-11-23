import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { GuessesService } from './guesses.service';
import { SubmitGuessDto } from './dto/submit-guess.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Throttle } from '@nestjs/throttler';
import { GUESS_SUBMIT_RATE_LIMIT_CONFIG } from '../middleware/rate-limit.config';

@Controller('guesses')
export class GuessesController {
  constructor(private readonly guessesService: GuessesService) {}

  @UseGuards(JwtAuthGuard)
  @Post('submit')
  @Throttle(GUESS_SUBMIT_RATE_LIMIT_CONFIG.limit, GUESS_SUBMIT_RATE_LIMIT_CONFIG.ttl)
  async submitGuess(@Request() req, @Body() submitGuessDto: SubmitGuessDto) {
    const userId = req.user?.userId;

    if (!userId || typeof userId !== 'string') {
      throw new BadRequestException(
        'Invalid authentication payload: missing or invalid userId',
      );
    }

    // proceed to call service with validated values
    return this.guessesService.submitGuess(userId, submitGuessDto);
  }
}
