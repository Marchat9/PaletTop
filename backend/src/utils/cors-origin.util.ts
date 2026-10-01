/**
 * Allowed CORS origins, shared by the HTTP app and the websocket gateways.
 *
 * `CORS_ORIGIN` is a comma-separated list (e.g. "https://palettop.club,https://admin.palettop.club").
 * Defaults to '*' so a fresh self-hosted deployment works out of the box; set it in production to
 * lock the API down to the front's origin.
 */
export function corsOrigin(): string | string[] {
    const configured = process.env.CORS_ORIGIN;
    if (!configured) {
        return '*';
    }
    return configured.split(',').map((origin) => origin.trim());
}
