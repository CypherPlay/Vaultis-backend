import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class GameLogicService {
  async checkGuess(userGuess: string, correctAnswer: string): Promise<boolean> {
    const normalizedUserGuess = userGuess.trim().toLowerCase();
    const normalizedCorrectAnswer = correctAnswer.trim().toLowerCase();

    const userGuessBuffer = Buffer.from(normalizedUserGuess);
    const correctAnswerBuffer = Buffer.from(normalizedCorrectAnswer);

    if (userGuessBuffer.length !== correctAnswerBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(userGuessBuffer, correctAnswerBuffer);
  }
}
