import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const scoreWeights = {
    error404: 0.3,
    error503: 0.5,
    warning: 0.2
}

export const CalculateScore = async (domainId: string): Promise<any> => {
    const domain = await prisma.domain.findFirst({ where: { id: domainId } });
    if (!domain) {
        console.log('calculate score: domain not found');
        return false;
    }

    let score;

    if (domain.error503) {
        score = 0;
    }
    else {
        score = (
            scoreWeights.error503 +
            (domain.error404 ? 0 : scoreWeights.error404) +
            (domain.warning ? 0 : scoreWeights.warning)
        );
    }

    console.log('score', score);

    await prisma.domain.update({ where: { id: domain.id }, data: { score } })

    return score;
}