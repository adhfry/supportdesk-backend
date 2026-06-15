import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';
import { UnsupportedMediaTypeException, ValidationPipe } from '@nestjs/common';
import { StandardResponseInterceptor } from './common/interceptors/standard-response.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');

  // 1. Mengaktifkan Cookie Parser
  app.use(cookieParser());

  // 1a. Tolak request yang membawa body tetapi bukan application/json
  app.use((req, _res, next) => {
    const contentType = req.headers['content-type'];
    const hasRequestBody =
      Number(req.headers['content-length'] ?? 0) > 0 ||
      req.headers['transfer-encoding'] !== undefined;

    if (contentType && !contentType.startsWith('application/json')) {
      throw new UnsupportedMediaTypeException(
        'Hanya application/json yang didukung',
      );
    }

    if (hasRequestBody && !contentType) {
      throw new UnsupportedMediaTypeException(
        'Request body wajib menggunakan application/json',
      );
    }

    next();
  });

  // 2. Konfigurasi CORS untuk Frontend Nuxt 3 (wajib credentials: true)
  app.enableCors({
    origin: 'http://localhost:3021', // URL Frontend Nuxt 3
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

  const swaggerConfig = new DocumentBuilder()
    .setTitle('SupportDesk API')
    .setDescription(
      'API backend untuk pelacakan paket bermasalah, komplain seller, dan status penanganan CS',
    )
    .setVersion('1.0')
    .addCookieAuth('access_token')
    .build();

  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, swaggerDocument, {
    useGlobalPrefix: true,
    swaggerOptions: {
      persistAuthorization: true,
    },
    customSiteTitle: 'SupportDesk Docs',
  });

  await app.listen(3020); // Backend jalan di port 3020
  console.log('Backend berjalan di http://localhost:3020');
}
bootstrap();
