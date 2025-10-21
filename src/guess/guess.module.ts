import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Guess, GuessSchema } from '../schemas/guess.schema';
import { GuessService } from './guess.service';
import { AuthModule } from '../auth/auth.module'; // Import AuthModule to use UserService
import { RiddleModule } from '../riddle/riddle.module'; // Import RiddleModule to use RiddleService

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Guess.name, schema: GuessSchema }]),
    AuthModule,
    RiddleModule,
  ],
  controllers: [],
  providers: [GuessService],
  exports: [GuessService], // Export GuessService if it needs to be used by other modules
})
export class GuessModule {}
