import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { LoggerService } from './logger/logger.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useLogger(app.get(LoggerService));
  // When deploying behind a proxy (e.g., Nginx, AWS ELB), it is crucial to set the 'trust proxy' setting to true.
  // This ensures that req.ip correctly extracts the client's IP address from 'X-Forwarded-For' headers.
  // For more details, refer to the Express documentation on 'trust proxy'.
  app.set('trust proxy', true);
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
