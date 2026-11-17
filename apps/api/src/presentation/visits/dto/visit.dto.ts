import { createZodDto } from 'nestjs-zod';
import { StartVisitRequestSchema, TrackBatchRequestSchema, VisitEventRequestSchema } from '@app/contracts';

export class StartVisitDto extends createZodDto(StartVisitRequestSchema) {}
export class VisitEventDto extends createZodDto(VisitEventRequestSchema) {}
export class TrackBatchDto extends createZodDto(TrackBatchRequestSchema) {}
