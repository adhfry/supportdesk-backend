import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { map, Observable } from 'rxjs';

type StandardResponse<T> = {
  success: boolean;
  message: string;
  data: T | null;
  errors: null;
};

@Injectable()
export class StandardResponseInterceptor<T> implements NestInterceptor<
  T,
  StandardResponse<T>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<StandardResponse<T>> {
    return next.handle().pipe(
      map((body) => {
        if (
          body !== null &&
          typeof body === 'object' &&
          'success' in body &&
          'message' in body &&
          'data' in body &&
          'errors' in body
        ) {
          return body as StandardResponse<T>;
        }

        if (typeof body === 'string') {
          return {
            success: true,
            message: body,
            data: null,
            errors: null,
          };
        }

        if (
          body !== null &&
          typeof body === 'object' &&
          'message' in body &&
          !('data' in body)
        ) {
          const payload = body as { message?: string };

          return {
            success: true,
            message: payload.message ?? 'Success',
            data: null,
            errors: null,
          };
        }

        const payload = body as T;

        return {
          success: true,
          message: 'Success',
          data: payload ?? null,
          errors: null,
        };
      }),
    );
  }
}
