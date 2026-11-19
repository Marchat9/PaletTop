export function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
    if (!value?.trim()) return defaultValue;
    return value.trim().toLowerCase() === 'true';
}

export function parseNumber(
    value: string | undefined,
    defaultValue: number,
    isOnlyPositive = false,
): number {
    if (!value?.trim()) return defaultValue;
    const parsed = Number(value);
    return Number.isFinite(parsed) && (!isOnlyPositive || parsed > 0) ? parsed : defaultValue;
}

/** A value read from env vars, with the names of the vars that were actually set. */
export interface EnvValue<T> {
    value: T;
    /** Comma-separated names of the env vars that were set. */
    sourceDetail: string;
}

/** Names, among `names`, of the env vars set to a non-blank value. */
export function setEnvVarNames(env: NodeJS.ProcessEnv, names: readonly string[]): string[] {
    return names.filter((name) => !!env[name]?.trim());
}

/**
 * Reads a group of env vars: undefined when none of them is set, otherwise the value built by
 * `read` (unset vars of the group take their default inside `read`).
 */
export function readEnvGroup<T>(
    env: NodeJS.ProcessEnv,
    names: readonly string[],
    read: (env: NodeJS.ProcessEnv) => T,
): EnvValue<T> | undefined {
    const setNames = setEnvVarNames(env, names);
    if (!setNames.length) return undefined;
    return { value: read(env), sourceDetail: setNames.join(', ') };
}
