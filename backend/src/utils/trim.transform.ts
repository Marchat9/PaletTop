import { TransformFnParams } from 'class-transformer';

/** Strips the spaces around a text value, and leaves anything else untouched. */
export function trimmed({ value }: TransformFnParams): unknown {
    return typeof value === 'string' ? value.trim() : value;
}
