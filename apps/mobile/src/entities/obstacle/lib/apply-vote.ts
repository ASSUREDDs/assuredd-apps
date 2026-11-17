import type { Obstacle, ObstacleVote } from '@app/contracts';

/** What the obstacle looks like after the courier's own mark, before the server confirms it. */
export function applyVote(obstacle: Obstacle, vote: ObstacleVote): Obstacle {
    const counts = { ...obstacle.confirmations };

    if (obstacle.myVote === 'still_relevant') counts.stillRelevant -= 1;
    if (obstacle.myVote === 'no_longer_relevant') counts.noLongerRelevant -= 1;
    if (vote === 'still_relevant') counts.stillRelevant += 1;
    else counts.noLongerRelevant += 1;

    return { ...obstacle, myVote: vote, confirmations: counts };
}
