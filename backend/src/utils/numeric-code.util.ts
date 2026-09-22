// Check already used codes
export function generateNumericCode(existingCodes: string[], length = 4): string {
    const max = 10 ** length; //  = Math.pow(10, length);
    let code: string;
    do {
        code = Math.floor(Math.random() * max)
            .toString()
            .padStart(length, '0');
    } while (existingCodes.includes(code));
    return code;
}
