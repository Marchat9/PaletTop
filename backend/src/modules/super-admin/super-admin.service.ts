import {
    HttpException,
    HttpStatus,
    Injectable,
    Logger,
    UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SuperAdminConfig } from 'src/config/super-admin.config';
import { verifyPassword } from 'src/utils/password-hash.util';

interface AttemptState {
    failedAttempts: number;
    lockedUntil: number | null;
    consecutiveLockouts: number;
}

const LOCKOUT_MESSAGE = 'Trop de tentatives. Veuillez réessayer plus tard.';

@Injectable()
export class SuperAdminService {
    private readonly logger = new Logger(SuperAdminService.name);
    private readonly config: SuperAdminConfig;
    private readonly attempts = new Map<string, AttemptState>();

    constructor(private readonly configService: ConfigService) {
        this.config = this.configService.getOrThrow<SuperAdminConfig>('superAdmin');
    }

    async login(password: string, ip: string): Promise<void> {
        this.logger.debug(`Attempt to connect to super admin with ip : '${ip}'`);
        // Checked before hashing, so a locked-out IP does not cost an Argon2 computation.
        this.assertNotLockedOut(ip);

        // argon2.verify compares in constant time and runs off the event loop.
        const valid = await verifyPassword(this.config.passwordHash, password);

        // Checked again after the await: a parallel attempt from the same IP may have triggered
        // the lockout meanwhile. Answering 429 keeps those attempts from revealing anything.
        this.assertNotLockedOut(ip);

        if (valid) {
            this.attempts.delete(ip);
            return;
        }

        // Re-read: the state seen before the await may be stale (parallel attempts).
        this.registerFailedAttempt(ip, this.attempts.get(ip));
    }

    private assertNotLockedOut(ip: string): void {
        const lockedUntil = this.attempts.get(ip)?.lockedUntil;
        if (lockedUntil !== null && lockedUntil !== undefined && lockedUntil > Date.now()) {
            this.logger.warn(`Super admin login attempt refused (IP locked out): '${ip}'`);
            throw new HttpException(LOCKOUT_MESSAGE, HttpStatus.TOO_MANY_REQUESTS);
        }
    }

    private registerFailedAttempt(ip: string, existing: AttemptState | undefined): void {
        const state: AttemptState = existing ?? {
            failedAttempts: 0,
            lockedUntil: null,
            consecutiveLockouts: 0,
        };
        state.failedAttempts += 1;

        if (state.failedAttempts < this.config.maxAttempts) {
            this.attempts.set(ip, state);
            this.logger.warn(
                `Super admin login failed (${state.failedAttempts}/${this.config.maxAttempts}): '${ip}'`,
            );
            throw new UnauthorizedException('Mot de passe invalide');
        }

        state.consecutiveLockouts += 1;
        state.failedAttempts = 0;
        const delaySeconds = Math.min(
            this.config.lockoutBaseDelaySeconds * 2 ** (state.consecutiveLockouts - 1),
            this.config.lockoutMaxDelaySeconds,
        );
        state.lockedUntil = Date.now() + delaySeconds * 1000;
        this.attempts.set(ip, state);

        this.logger.warn(
            `IP locked out after too many failed super admin login attempts (lockout #${state.consecutiveLockouts}, ${delaySeconds}s): '${ip}'`,
        );
        throw new HttpException(LOCKOUT_MESSAGE, HttpStatus.TOO_MANY_REQUESTS);
    }
}
