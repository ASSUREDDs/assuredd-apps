import { createZodDto } from 'nestjs-zod';
import { RegisterRequestSchema } from '@app/contracts';

export class RegisterDto extends createZodDto(RegisterRequestSchema) {}
