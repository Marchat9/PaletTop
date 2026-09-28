import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * The rate limit is about HTTP requests (guessing participant codes, hammering an endpoint).
 * Websocket message handlers have no HTTP request to key on, so this guard lets them straight
 * through and only throttles the HTTP pipeline.
 */
@Injectable()
export class HttpThrottlerGuard extends ThrottlerGuard {
    async canActivate(context: ExecutionContext): Promise<boolean> {
        if (context.getType() !== 'http') {
            return true;
        }
        return super.canActivate(context);
    }
}
