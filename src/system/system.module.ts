import { Module } from '@nestjs/common';
import { SystemController } from './system.controller';
import { SystemService } from './system.service';
import { MongooseConfigModule } from '../database/mongoose.module';
import { BlockchainModule } from '../blockchain/blockchain.module';
import { RedisModule } from '../database/redis.module';

@Module({
  imports: [MongooseConfigModule, BlockchainModule, RedisModule],
  controllers: [SystemController],
  providers: [SystemService],
})
export class SystemModule {}
