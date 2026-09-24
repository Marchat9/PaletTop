import { TransformFnParams } from 'class-transformer';

/** Retire les espaces autour d'une valeur textuelle, et laisse le reste intact. */
export function trimmed({ value }: TransformFnParams): unknown {
    return typeof value === 'string' ? value.trim() : value;
}
