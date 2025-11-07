import { Module } from '@nestjs/common';
import { GameLogicService } from './game-logic.service';

@Module({
  providers: [GameLogicService],
  exports: [GameLogicService],
})
export class GameModule {}
