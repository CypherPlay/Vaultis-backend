import { Controller, Post, Body, UseGuards, Request, BadRequestException } from '@nestjs/common';
import { GuessesService } from './guesses.service';
import { SubmitGuessDto } from './dto/submit-guess.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('guesses')
export class GuessesController {
  constructor(private readonly guessesService: GuessesService) {}

  @UseGuards(JwtAuthGuard)
  @Post('submit')
  async submitGuess(@Request() req, @Body() submitGuessDto: SubmitGuessDto) {
    const userId = req.user?.userId;
    const walletAddress = req.user?.walletAddress;

    if (!userId || typeof userId !== 'string') {
      throw new BadRequestException('Invalid authentication payload: missing or invalid userId');
    }
    if (!walletAddress || typeof walletAddress !== 'string') {
      throw new BadRequestException('Invalid authentication payload: missing or invalid walletAddress');
    }

    // proceed to call service with validated values
    return this.guessesService.submitGuess(userId, walletAddress, submitGuessDto);
  }
}
