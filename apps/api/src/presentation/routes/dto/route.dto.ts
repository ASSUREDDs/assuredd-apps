import { createZodDto } from 'nestjs-zod';
import { CheckRouteRequestSchema, RouteRequestSchema } from '@app/contracts';

export class RouteRequestDto extends createZodDto(RouteRequestSchema) {}
export class CheckRouteRequestDto extends createZodDto(CheckRouteRequestSchema) {}
