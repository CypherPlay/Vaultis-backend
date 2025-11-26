import { NestFactory, HttpAdapterHost } from '@nestjs/core';
import { AppModule } from './app.module';
import { LoggerService } from './logger/logger.service';
import { initializeSentry } from './logger/sentry.config';
import { SentryExceptionFilter } from './common/filters/sentry-exception.filter';

async function bootstrap() {
  initializeSentry();
  const app = await NestFactory.create(AppModule);
  app.useLogger(app.get(LoggerService));

  const { httpAdapter } = app.get(HttpAdapterHost);
  app.useGlobalFilters(new SentryExceptionFilter(httpAdapter));

  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.set('trust proxy', true);
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
