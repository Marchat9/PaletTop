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

// Squelette partagé par les crons "action différée sur ce qui est resté inactif trop longtemps"
// (nettoyage des tournois, clôture automatique des entraînements) : lecture du flag d'activation,
// enregistrement/démarrage du CronJob, log. La logique métier propre à chaque cron (`run`) reste
// entièrement dans son service.
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

    // run() est catché ici : une rejection non gérée dans un CronJob remonte comme une unhandled
    // promise rejection Node (qui tue le process par défaut) plutôt que d'être simplement loguée.
    const job = new CronJob(options.cronExpression, () => {
        run().catch((error: unknown) => {
            logger.error(`Échec de l'exécution du job "${options.jobName}"`, error);
        });
    });
    schedulerRegistry.addCronJob(options.jobName, job);
    job.start();
    logger.log(options.scheduledMessage);
}
