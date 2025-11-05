import { Module } from '@nestjs/common';
import { GuessesController } from './guesses.controller';
import { GuessesService } from './guesses.service';
import { AuthModule } from '../auth/auth.module';
import { MongooseModule } from '@nestjs/mongoose';
import { Guess, GuessSchema } from '../schemas/guess.schema';

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([{ name: Guess.name, schema: GuessSchema }]),
  ],
  controllers: [GuessesController],
  providers: [GuessesService],
  exports: [GuessesService],
})
export class GuessesModule {}
