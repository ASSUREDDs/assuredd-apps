import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';

interface HttpResponseLike {
    status(code: number): this;
    json(body: unknown): void;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger(GlobalExceptionFilter.name);

    catch(exception: unknown, host: ArgumentsHost): void {
        const response = host.switchToHttp().getResponse<HttpResponseLike>();

        if (exception instanceof HttpException) {
            response.status(exception.getStatus()).json(exception.getResponse());
            return;
        }

        this.logger.error(exception instanceof Error ? exception.stack : exception);
        response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
            code: 'INTERNAL_ERROR',
            message: 'Unexpected error',
        });
    }
}
