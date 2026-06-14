import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';
import { ValidationPipe } from '@nestjs/common';
import { StandardResponseInterceptor } from './common/interceptors/standard-response.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 1. Mengaktifkan Cookie Parser
  app.use(cookieParser());

  // 2. Konfigurasi CORS untuk Frontend Nuxt 3 (wajib credentials: true)
  app.enableCors({
    origin: 'http://localhost:3000', // URL Frontend Nuxt 3
    credentials: true,
  });

  // 3. Mengaktifkan Validasi Input Global
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  app.useGlobalInterceptors(new StandardResponseInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());

  await app.listen(3020); // Backend jalan di port 3020
  console.log('Backend berjalan di http://localhost:3020');
}
bootstrap();
