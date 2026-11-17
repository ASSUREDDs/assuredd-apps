import { createZodDto } from 'nestjs-zod';
import { CreateObstacleRequestSchema, SearchObstaclesQuerySchema, VoteObstacleRequestSchema } from '@app/contracts';

export class CreateObstacleDto extends createZodDto(CreateObstacleRequestSchema) {}
export class VoteObstacleDto extends createZodDto(VoteObstacleRequestSchema) {}
export class SearchObstaclesQueryDto extends createZodDto(SearchObstaclesQuerySchema) {}
