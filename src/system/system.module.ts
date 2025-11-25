import { Module } from '@nestjs/common';
import { SystemController } from './system.controller';
import { SystemService } from './system.service';
import { MongooseModule } from '@nestjs/mongoose';
import { BlockchainModule } from '../blockchain/blockchain.module';
import { RedisModule } from '../database/redis.module';

@Module({
  imports: [MongooseModule, BlockchainModule, RedisModule],
  controllers: [SystemController],
  providers: [SystemService],
})
export class SystemModule {}
