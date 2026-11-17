import { createZodDto } from 'nestjs-zod';
import { SearchAddressesQuerySchema } from '@app/contracts';

export class SearchAddressesQueryDto extends createZodDto(SearchAddressesQuerySchema) {}
