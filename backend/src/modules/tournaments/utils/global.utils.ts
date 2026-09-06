// Mélange aléatoire non-biaisé : chaque élément a une probabilité égale d'atterrir à n'importe quelle position.
// Fonctionne en parcourant le tableau de la fin vers le début et en échangeant chaque élément
// avec un élément choisi aléatoirement parmi ceux qui le précèdent (lui inclus). `random` est
// injectable (tests déterministes) ; le `Math.min(..., i)` protège contre le cas limite où
// `random()` renvoie exactement 1 (index qui sortirait sinon du tableau).
export function shuffleFisherYates<T>(array: T[], random: () => number = Math.random): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.min(Math.floor(random() * (i + 1)), i);
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}
