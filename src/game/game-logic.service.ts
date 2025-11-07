import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class GameLogicService {
  async checkGuess(userGuess: string, correctAnswer: string): Promise<boolean> {
    if (userGuess === null || userGuess === undefined || correctAnswer === null || correctAnswer === undefined) {
      return false;
    }
    const normalizedUserGuess = userGuess.trim().toLowerCase();
    const normalizedCorrectAnswer = correctAnswer.trim().toLowerCase();

    if (normalizedUserGuess === '' || normalizedCorrectAnswer === '') {
      return false;
    }

    const userGuessBuffer = Buffer.from(normalizedUserGuess);
    const correctAnswerBuffer = Buffer.from(normalizedCorrectAnswer);

    if (userGuessBuffer.length !== correctAnswerBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(userGuessBuffer, correctAnswerBuffer);
  }
}
