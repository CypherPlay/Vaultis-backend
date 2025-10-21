import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Guess, GuessSchema } from '../schemas/guess.schema';
import { GuessController } from './guess.controller';

@Module({
  imports: [MongooseModule.forFeature([{ name: Guess.name, schema: GuessSchema }])],
  controllers: [GuessController],
  providers: [],
})
export class GuessModule {}
