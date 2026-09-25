import { createZodDto } from 'nestjs-zod';
import { LoginRequestSchema } from '@app/contracts';

export class LoginDto extends createZodDto(LoginRequestSchema) {}
