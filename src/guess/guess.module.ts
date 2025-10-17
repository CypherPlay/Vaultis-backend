import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Guess, GuessSchema } from '../schemas/guess.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: Guess.name, schema: GuessSchema }])],
  controllers: [],
  providers: [],
})
export class GuessModule {}
