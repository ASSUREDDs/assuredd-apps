import { Inject, Injectable } from '@nestjs/common';

import { ObstacleNotFoundError } from '@domain/obstacles/domain-error';
import { isObstacleActive, ObstacleStatus, RemovalReason } from '@domain/obstacles/obstacle.entity';
import { OBSTACLE_REPOSITORY, type ObstacleRepository } from '@domain/obstacles/obstacle.repository';
import { ForbiddenError } from '@domain/shared/forbidden.error';
import { err, ok, type Result } from '@domain/shared/result';
import { CLOCK, type Clock } from '@application/shared/ports/clock.port';

export interface RemoveObstacleInput {
    tenantId: string;
    userId: string;
    role: string;
    obstacleId: string;
}

/** Immediate removal for mistakes: only the author or an admin. Everyone else votes instead. */
@Injectable()
export class RemoveObstacleUseCase {
    constructor(
        @Inject(OBSTACLE_REPOSITORY) private readonly obstacles: ObstacleRepository,
        @Inject(CLOCK) private readonly clock: Clock,
    ) {}

    async execute(input: RemoveObstacleInput): Promise<Result<void, ObstacleNotFoundError | ForbiddenError>> {
        const now = this.clock.now();
        const current = await this.obstacles.findView(input.tenantId, input.userId, input.obstacleId);
        if (!current || !isObstacleActive(current, now)) return err(new ObstacleNotFoundError());

        if (current.createdBy !== input.userId && input.role !== 'admin') {
            return err(new ForbiddenError('Only the author or an admin can remove an obstacle'));
        }

        await this.obstacles.markInactive(input.obstacleId, ObstacleStatus.Removed, RemovalReason.Manual, now);
        return ok(undefined);
    }
}
