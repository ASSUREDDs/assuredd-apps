import { Inject, Injectable } from '@nestjs/common';

import { ObstacleNotFoundError } from '@domain/obstacles/domain-error';
import {
    isObstacleActive,
    ObstacleKind,
    ObstacleStatus,
    type ObstacleView,
    ObstacleVote,
    RemovalReason,
} from '@domain/obstacles/obstacle.entity';
import { OBSTACLE_REPOSITORY, type ObstacleRepository } from '@domain/obstacles/obstacle.repository';
import { err, ok, type Result } from '@domain/shared/result';
import { CLOCK, type Clock } from '@application/shared/ports/clock.port';

import { OBSTACLE_POLICY, type ObstaclePolicy } from './ports/obstacle-policy.port';

export interface VoteObstacleInput {
    tenantId: string;
    userId: string;
    obstacleId: string;
    vote: ObstacleVote;
}

@Injectable()
export class VoteObstacleUseCase {
    constructor(
        @Inject(OBSTACLE_REPOSITORY) private readonly obstacles: ObstacleRepository,
        @Inject(OBSTACLE_POLICY) private readonly policy: ObstaclePolicy,
        @Inject(CLOCK) private readonly clock: Clock,
    ) {}

    async execute(input: VoteObstacleInput): Promise<Result<ObstacleView, ObstacleNotFoundError>> {
        const now = this.clock.now();
        const current = await this.obstacles.findView(input.tenantId, input.userId, input.obstacleId);
        if (!current || !isObstacleActive(current, now)) return err(new ObstacleNotFoundError());

        await this.obstacles.upsertVote(input.obstacleId, input.userId, input.vote, now);

        if (input.vote === ObstacleVote.StillRelevant && current.kind === ObstacleKind.Incident) {
            await this.obstacles.extendExpiry(input.obstacleId, new Date(now.getTime() + this.policy.incidentTtlMs));
        }

        const updated = await this.obstacles.findView(input.tenantId, input.userId, input.obstacleId);
        if (!updated) return err(new ObstacleNotFoundError());

        if (updated.confirmations.noLongerRelevant >= this.policy.dismissThreshold) {
            await this.obstacles.markInactive(input.obstacleId, ObstacleStatus.Removed, RemovalReason.Dismissed, now);
            return ok({ ...updated, status: ObstacleStatus.Removed });
        }

        return ok(updated);
    }
}
