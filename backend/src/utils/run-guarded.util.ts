import {
    ConflictException,
    HttpException,
    InternalServerErrorException,
    Logger,
} from '@nestjs/common';
import { QueryFailedError } from 'typeorm';

interface RunGuardedOptions {
    // Allow to format postgres error message to readable error
    pgErrorMessages?: Partial<Record<string, string>>;
}

// Shared errors wrapping between controlers
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
