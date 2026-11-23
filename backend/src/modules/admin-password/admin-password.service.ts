import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PasswordConfig } from 'src/config/password.config';
import { hashPassword, verifyPassword } from 'src/utils/password-hash.util';

/** Hashes and verifies tournament/training admin passwords with the configured pepper. */
@Injectable()
export class AdminPasswordService {
    private readonly pepper: string;

    constructor(configService: ConfigService) {
        this.pepper = configService.getOrThrow<PasswordConfig>('password').pepper;
    }

    hash(plain: string): Promise<string> {
        return hashPassword(plain, this.pepper);
    }

    async verify(storedHash: string | null | undefined, plain: string): Promise<boolean> {
        if (!storedHash) return false;
        return verifyPassword(storedHash, plain, this.pepper);
    }
}
