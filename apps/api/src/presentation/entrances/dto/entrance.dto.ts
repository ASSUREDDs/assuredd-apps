import { createZodDto } from 'nestjs-zod';
import { CreateEntranceRequestSchema, SearchEntrancesQuerySchema } from '@app/contracts';

export class CreateEntranceDto extends createZodDto(CreateEntranceRequestSchema) {}
export class SearchEntrancesQueryDto extends createZodDto(SearchEntrancesQuerySchema) {}
