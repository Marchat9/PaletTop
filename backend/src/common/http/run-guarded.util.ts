import {
    ConflictException,
    HttpException,
    InternalServerErrorException,
    Logger,
} from '@nestjs/common';
import { QueryFailedError } from 'typeorm';

interface RunGuardedOptions {
    // Traduit une violation de contrainte Postgres en 409 lisible plutôt que de laisser remonter
    // un 500 brut. Clé = nom de contrainte/index explicitement nommé (précis, prioritaire) ou code
    // d'erreur Postgres générique en repli (ex. '23505' unicité, '23503' clé étrangère). Extensible
    // sans toucher runGuarded lui-même : un futur appelant qui a besoin d'un nouveau cas n'a qu'à
    // ajouter une entrée à sa propre map.
    pgErrorMessages?: Partial<Record<string, string>>;
}

// Wrapping d'erreurs partagé par les contrôleurs : une HttpException levée par le service passe
// telle quelle, tout le reste est journalisé puis traduit en 500 générique (sauf violation de
// contrainte Postgres explicitement prise en charge via `pgErrorMessages`).
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

        if (options?.pgErrorMessages && error instanceof QueryFailedError) {
            const driverError = error.driverError as
                { code?: string; constraint?: string } | undefined;
            const message =
                (driverError?.constraint && options.pgErrorMessages[driverError.constraint]) ||
                (driverError?.code && options.pgErrorMessages[driverError.code]);
            if (message) {
                throw new ConflictException(message);
            }
        }

        logger.error(errorMessage, error);
        throw new InternalServerErrorException(errorMessage);
    }
}
