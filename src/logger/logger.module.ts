import { Module, Global } from '@nestjs/common';
import { LoggerService } from './logger.service';
import logger from './winston.config';

@Global()
@Module({
  providers: [
    {
      provide: 'WINSTON_LOGGER',
      useValue: logger,
    },
    LoggerService,
  ],
  exports: [LoggerService],
})
export class LoggerModule {}
