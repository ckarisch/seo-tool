import { CronJob, Domain, UserRole } from "@prisma/client";
import { createLogger, LogEntry } from "../dev/logger";


export interface domainIntervalResponse {
    domainInterval: number
}

export async function* domainIntervalGenerator(userRole: string, domain: Partial<Domain>, cron: CronJob, fallbackInterval = 1420): AsyncGenerator<LogEntry, domainIntervalResponse>{
    let domainInterval = fallbackInterval;
    let intervalFound = false;
    const logger = createLogger('interval');

    switch (userRole) {
        case UserRole.STANDARD:
            if (cron.standardInterval) {
                yield* logger.log(`domain ${domain.domainName} standard interval`);
                domainInterval = cron.standardInterval;
                intervalFound = true;
            }
            break;
        case UserRole.PREMIUM:
            if (cron.premiumInterval) {
                yield* logger.log(`domain ${domain.domainName} premium interval`);
                domainInterval = cron.premiumInterval;
                intervalFound = true;
            }
            break;
        case UserRole.ADMIN:
            if (cron.adminInterval) {
                yield* logger.log(`domain ${domain.domainName} admin interval`);
                domainInterval = cron.adminInterval;
                intervalFound = true;
            }
            break;
        default:
            domainInterval = fallbackInterval;
            break;
    }
    if (!intervalFound) {
        yield* logger.log(`domain ${domain.domainName} fallback interval`);
    }

    return {domainInterval};
}