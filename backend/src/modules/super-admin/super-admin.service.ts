import { createHash, timingSafeEqual } from 'crypto';
import {
    HttpException,
    HttpStatus,
    Injectable,
    Logger,
    UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SuperAdminConfig } from 'src/config/super-admin.config';

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

    login(password: string, ip: string): void {
        const state = this.attempts.get(ip);
        this.logger.debug(`Attemtp to connect to super admin with ip : ${ip}`);

        if (
            state?.lockedUntil !== null &&
            state?.lockedUntil !== undefined &&
            state.lockedUntil > Date.now()
        ) {
            this.logger.warn(`Super admin login attempt refused (IP locked out): ${ip}`);
            throw new HttpException(LOCKOUT_MESSAGE, HttpStatus.TOO_MANY_REQUESTS);
        }

        if (this.isPasswordValid(password)) {
            this.attempts.delete(ip);
            return;
        }

        this.registerFailedAttempt(ip, state);
    }

    // Timing-safe comparison: `===` short-circuits on the first mismatching
    // character, leaking how many leading characters are correct via response
    // time. Hashing first also gives timingSafeEqual two fixed-length (32-byte)
    // buffers, since it throws on a length mismatch.
    private isPasswordValid(password: string): boolean {
        const providedHash = createHash('sha256').update(password).digest();
        const expectedHash = createHash('sha256').update(this.config.password).digest();
        return timingSafeEqual(providedHash, expectedHash);
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
                `Super admin login failed (${state.failedAttempts}/${this.config.maxAttempts}): ${ip}`,
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
            `IP locked out after too many failed super admin login attempts (lockout #${state.consecutiveLockouts}, ${delaySeconds}s): ${ip}`,
        );
        throw new HttpException(LOCKOUT_MESSAGE, HttpStatus.TOO_MANY_REQUESTS);
    }
}
