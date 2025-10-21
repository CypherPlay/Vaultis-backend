import { Module } from '@nestjs/common';
import { GuessController } from './guess.controller';
import { GuessService } from './guess.service';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '../schemas/user.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: User.name, schema: UserSchema }])],
  controllers: [GuessController],
  providers: [GuessService],
  exports: [GuessService],
})
export class GuessModule {}
