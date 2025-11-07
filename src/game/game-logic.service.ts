import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

@Injectable()
export class GameLogicService {
  private readonly saltRounds = 10; // You can adjust this value

  async checkGuess(userGuess: string, correctAnswer: string): Promise<boolean> {
    // Hash both the user's guess and the correct answer for secure comparison
    // This prevents timing attacks and ensures the correct answer is never exposed directly
    const hashedGuess = await bcrypt.hash(userGuess, this.saltRounds);
    const hashedCorrectAnswer = await bcrypt.hash(correctAnswer, this.saltRounds);

    // Compare the two hashes. bcrypt.compare handles the salt and timing attack prevention.
    return bcrypt.compare(hashedGuess, hashedCorrectAnswer);
  }
}
