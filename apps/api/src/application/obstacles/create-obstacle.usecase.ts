import { Inject, Injectable } from '@nestjs/common';

import { InvalidObstacleGeometryError } from '@domain/obstacles/domain-error';
import {
    type NewObstacle,
    ObstacleKind,
    type ObstacleShape,
    type ObstacleView,
} from '@domain/obstacles/obstacle.entity';
import { OBSTACLE_REPOSITORY, type ObstacleRepository } from '@domain/obstacles/obstacle.repository';
import { err, ok, type Result } from '@domain/shared/result';
import { CLOCK, type Clock } from '@application/shared/ports/clock.port';
import { ID_GENERATOR, type IdGenerator } from '@application/shared/ports/id-generator.port';

import { OBSTACLE_POLICY, type ObstaclePolicy } from './ports/obstacle-policy.port';

export interface CreateObstacleInput {
    tenantId: string;
    userId: string;
    kind: ObstacleKind;
    shape: ObstacleShape;
    comment?: string;
}

@Injectable()
export class CreateObstacleUseCase {
    constructor(
        @Inject(OBSTACLE_REPOSITORY) private readonly obstacles: ObstacleRepository,
        @Inject(OBSTACLE_POLICY) private readonly policy: ObstaclePolicy,
        @Inject(CLOCK) private readonly clock: Clock,
        @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
    ) {}

    async execute(input: CreateObstacleInput): Promise<Result<ObstacleView, InvalidObstacleGeometryError>> {
        const now = this.clock.now();
        const obstacle: NewObstacle = {
            id: this.ids.generate(),
            tenantId: input.tenantId,
            createdBy: input.userId,
            kind: input.kind,
            shape: input.shape,
            comment: input.comment?.length ? input.comment : null,
            // Incidents fade away on their own; a closed arch stays until someone removes it.
            expiresAt: input.kind === ObstacleKind.Incident ? new Date(now.getTime() + this.policy.incidentTtlMs) : null,
            createdAt: now,
        };

        const stored = await this.obstacles.create(obstacle, this.policy.maxAreaM2);
        if (!stored) return err(new InvalidObstacleGeometryError());

        const view = await this.obstacles.findView(input.tenantId, input.userId, obstacle.id);
        if (!view) throw new Error('Obstacle disappeared right after creation');

        return ok(view);
    }
}
