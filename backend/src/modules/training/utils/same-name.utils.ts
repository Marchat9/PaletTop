/**
 * Two people of a club or of a session must be told apart: names are compared regardless of case
 * and of the spaces around them.
 */
export function sameName(a: string, b: string): boolean {
    return a.trim().toLocaleLowerCase('fr') === b.trim().toLocaleLowerCase('fr');
}
