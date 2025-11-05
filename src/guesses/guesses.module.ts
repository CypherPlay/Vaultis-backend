import { Module } from '@nestjs/common';
import { GuessesController } from './guesses.controller';
import { GuessesService } from './guesses.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [GuessesController],
  providers: [GuessesService],
})
export class GuessesModule {}
