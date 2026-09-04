import {
    ConflictException,
    HttpException,
    InternalServerErrorException,
    Logger,
} from '@nestjs/common';
import { QueryFailedError } from 'typeorm';

interface RunGuardedOptions {
    // Traduit une violation de contrainte unique Postgres (23505) en 409 lisible plutôt que de
    // laisser remonter un 500 brut.
    uniqueViolationMessage?: string;
}

// Wrapping d'erreurs partagé par les contrôleurs : une HttpException levée par le service passe
// telle quelle, tout le reste est journalisé puis traduit en 500 générique (sauf violation de
// contrainte unique explicitement prise en charge via `uniqueViolationMessage`).
export async function runGuarded<T>(
    logger: Logger,
    errorMessage: string,
    action: () => Promise<T>,
    options?: RunGuardedOptions,
): Promise<T> {
    try {
        return await action();
    } catch (error: unknown) {
        if (error instanceof HttpException) {
            throw error;
        }

        if (options?.uniqueViolationMessage && error instanceof QueryFailedError) {
            const driverError = error.driverError as { code?: string } | undefined;
            if (driverError?.code === '23505') {
                throw new ConflictException(options.uniqueViolationMessage);
            }
        }

        logger.error(errorMessage, error);
        throw new InternalServerErrorException(errorMessage);
    }
}
