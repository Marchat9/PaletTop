import { hashPassword } from '../utils/password-hash.util';

export const HASH_PASSWORD_USAGE =
    'Usage: npm run hash-password [-- <password>] (without argument, the password is asked without echo)';

/**
 * Prints the Argon2id hash of a password, to fill SUPER_ADMIN_PASSWORD_HASH. No pepper: the
 * super-admin hash lives in the environment next to the pepper, so it would add nothing.
 * Returns the process exit code.
 */
export async function runHashPassword(
    args: string[],
    promptHidden: () => Promise<string>,
    print: (line: string) => void,
): Promise<number> {
    const password = args[0] ?? (await promptHidden());
    if (!password) {
        print(HASH_PASSWORD_USAGE);
        return 1;
    }
    print(await hashPassword(password));
    return 0;
}
