import { createZodDto } from 'nestjs-zod';
import { RefreshRequestSchema } from '@app/contracts';

export class RefreshDto extends createZodDto(RefreshRequestSchema) {}
