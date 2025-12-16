import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class GameLogicService {
  private normalizeGuess(guess: string): string {
    return guess.trim().toLowerCase();
  }

  async checkGuess(userGuess: string, correctAnswer: string): Promise<boolean> {
    if (
      userGuess === null ||
      userGuess === undefined ||
      correctAnswer === null ||
      correctAnswer === undefined
    ) {
      return false;
    }
    const normalizedUserGuess = this.normalizeGuess(userGuess);
    const normalizedCorrectAnswer = this.normalizeGuess(correctAnswer);

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
