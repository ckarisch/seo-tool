interface ScoreComponents {
    quickCheckScore?: number | null;
    performanceScore?: number | null;
}

export function calculateOverallScore(scores: ScoreComponents): number | null {
    // Extract and validate scores
    const quickCheck = typeof scores.quickCheckScore === 'number' ? scores.quickCheckScore : null;
    const performance = typeof scores.performanceScore === 'number' ? scores.performanceScore : null;

    // Initialize weights (can be adjusted if needed)
    const weights = {
        quickCheck: 1,
        performance: 1
    };

    // Calculate weighted average
    let totalWeight = 0;
    let weightedSum = 0;

    if (quickCheck !== null) {
        weightedSum += quickCheck * weights.quickCheck;
        totalWeight += weights.quickCheck;
    }

    if (performance !== null) {
        weightedSum += performance * weights.performance;
        totalWeight += weights.performance;
    }

    // Return null if no valid scores are available
    if (totalWeight === 0) {
        return null;
    }

    // Calculate and round to 4 decimal places
    return Math.round((weightedSum / totalWeight) * 10000) / 10000;
}