import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { GuessesService } from './guesses.service';
import { SubmitGuessDto } from './dto/submit-guess.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('guesses')
export class GuessesController {
  constructor(private readonly guessesService: GuessesService) {}

  @UseGuards(JwtAuthGuard)
  @Post('submit')
  async submitGuess(@Request() req, @Body() submitGuessDto: SubmitGuessDto) {
    // req.user contains the authenticated user's information (from JWT payload)
    // You can access user's wallet information from req.user if it's included in the JWT payload
    const userId = req.user.userId;
    const walletAddress = req.user.walletAddress; // Assuming walletAddress is in JWT payload

    // Here you would implement the logic to process the guess,
    // verify it against the riddle, and update user's score/wallet.
    // This will involve interacting with GuessesService and potentially RiddleService.
    return this.guessesService.submitGuess(userId, walletAddress, submitGuessDto);
  }
}
