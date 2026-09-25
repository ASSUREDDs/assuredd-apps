import { createZodDto } from 'nestjs-zod';
import { LogoutRequestSchema } from '@app/contracts';

export class LogoutDto extends createZodDto(LogoutRequestSchema) {}
