// Générateur de code numérique partagé (sessions/participants training, équipes tournoi),
// vérifié contre une liste de codes déjà pris.
export function generateNumericCode(existingCodes: string[], length = 4): string {
    const max = 10 ** length;
    let code: string;
    do {
        code = Math.floor(Math.random() * max)
            .toString()
            .padStart(length, '0');
    } while (existingCodes.includes(code));
    return code;
}
