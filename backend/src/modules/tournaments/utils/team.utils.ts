import { generateNumericCode } from 'src/common/utils/numeric-code.util';

export function generateTeamCode(existingCodes: string[]): string {
    return generateNumericCode(existingCodes, 4);
}
