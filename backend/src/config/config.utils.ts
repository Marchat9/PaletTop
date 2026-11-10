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
