import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Request } from 'express';
import { resolveClientIp } from './client-ip.util';

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

    // Behind the edge network and the reverse proxy, req.ip is the proxy's for every request: all
    // the players of a tournament would share one quota. The real client IP is used instead,
    // resolved the same way as for the super admin lockout.
    protected getTracker(req: Request): Promise<string> {
        return Promise.resolve(resolveClientIp(req.headers['cf-connecting-ip'], req.ip));
    }
}
