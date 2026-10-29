/**
 * Resolves the real client IP for brute-force tracking. When this app runs
 * behind a reverse proxy / edge network, req.ip alone would resolve to the
 * proxy's own IP for every request, collapsing all visitors into a single
 * shared lockout bucket.
 *
 * `CF-Connecting-IP` is set by the edge network from the real client
 * connection and can't be spoofed by the client directly — unlike
 * X-Forwarded-For, which can carry a value injected by a client that
 * bypassed the edge network and reached the reverse proxy directly (a
 * reverse proxy typically appends its own entry without stripping a forged
 * value already present).
 *
 * INFRA WARNING: this protection assumes the reverse proxy is only
 * reachable through the edge network — it should be firewalled to only
 * accept connections from the edge network's published IP ranges,
 * otherwise this header remains spoofable by a client bypassing it
 * directly.
 *
 * Falls back to `fallbackIp` (req.ip) when the header is absent — the local
 * dev case, with no edge network in front of the app.
 */
export function resolveClientIp(
    cfConnectingIpHeader: string | string[] | undefined,
    fallbackIp: string | undefined,
): string {
    if (typeof cfConnectingIpHeader === 'string' && cfConnectingIpHeader.trim().length > 0) {
        return cfConnectingIpHeader.trim();
    }
    return fallbackIp ?? 'unknown';
}
