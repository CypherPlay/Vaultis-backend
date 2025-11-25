import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { LoggerService } from './logger/logger.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useLogger(app.get(LoggerService));
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.set('trust proxy', true);
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
