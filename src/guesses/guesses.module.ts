import { Module } from '@nestjs/common';
import { GuessesController } from './guesses.controller';
import { GuessesService } from './guesses.service';
import { AuthModule } from '../auth/auth.module';
import { MongooseModule } from '@nestjs/mongoose';
import { Guess, GuessSchema } from '../schemas/guess.schema';
import { User, UserSchema } from '../schemas/user.schema';
import { Riddle, RiddleSchema } from '../schemas/riddle.schema';
import { WalletModule } from '../wallet/wallet.module';
import { GuessesRepository } from './guesses.repository';

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      { name: Guess.name, schema: GuessSchema },
      { name: User.name, schema: UserSchema },
      { name: Riddle.name, schema: RiddleSchema },
    ]),
    WalletModule,
  ],
  controllers: [GuessesController],
  providers: [GuessesService, GuessesRepository],
  exports: [GuessesService],
})
export class GuessesModule {}
