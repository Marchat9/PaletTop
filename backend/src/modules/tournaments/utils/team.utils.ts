export function generateTeamCode(existingCodes: string[]): string {
    let code: string;
    do {
        code = Math.floor(Math.random() * 10000)
            .toString()
            .padStart(4, '0');
    } while (existingCodes.includes(code));
    return code;
}
