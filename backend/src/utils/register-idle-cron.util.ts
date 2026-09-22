import { Logger } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';

interface RegisterIdleCronOptions {
    enabled: boolean;
    cronExpression: string;
    jobName: string;
    disabledMessage: string;
    scheduledMessage: string;
}

export function registerIdleCron(
    logger: Logger,
    schedulerRegistry: SchedulerRegistry,
    options: RegisterIdleCronOptions,
    run: () => Promise<void>,
): void {
    if (!options.enabled) {
        logger.debug(options.disabledMessage);
        return;
    }

    const job = new CronJob(options.cronExpression, () => {
        run().catch((error: unknown) => {
            logger.error(`Échec de l'exécution du job "${options.jobName}"`, error);
        });
    });
    schedulerRegistry.addCronJob(options.jobName, job);
    job.start();
    logger.log(options.scheduledMessage);
}
