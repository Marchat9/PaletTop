import { ConstraintLevel } from 'src/enum/constraint-level.enum';
import { ConstraintConfig } from 'src/model/constraint.model';

const CLUB_STRENGTH: Record<ConstraintLevel, 'none' | 'full' | 'partial'> = {
    [ConstraintLevel.NO_SAME_CLUB]: 'full',
    [ConstraintLevel.NO_PARTIAL_SAME_CLUB]: 'partial',
    [ConstraintLevel.NO_REMATCH_NO_SAME_CLUB]: 'full',
    [ConstraintLevel.NO_REMATCH_NO_PARTIAL_SAME_CLUB]: 'partial',
    [ConstraintLevel.NO_REMATCH]: 'none',
    [ConstraintLevel.NO_CONTRAINTE]: 'none',
};

const CHECKS_REMATCH: Record<ConstraintLevel, boolean> = {
    [ConstraintLevel.NO_SAME_CLUB]: false,
    [ConstraintLevel.NO_PARTIAL_SAME_CLUB]: false,
    [ConstraintLevel.NO_REMATCH_NO_SAME_CLUB]: true,
    [ConstraintLevel.NO_REMATCH_NO_PARTIAL_SAME_CLUB]: true,
    [ConstraintLevel.NO_REMATCH]: true,
    [ConstraintLevel.NO_CONTRAINTE]: false,
};

// Du plus strict au plus permissif. A club égal, on privilégie l'évitement de la revanche
// (cf. décision produit : éviter une revanche prime sur éviter un chevauchement partiel de club).
const STRICTNESS_ORDER: ConstraintLevel[] = [
    ConstraintLevel.NO_REMATCH_NO_PARTIAL_SAME_CLUB,
    ConstraintLevel.NO_REMATCH_NO_SAME_CLUB,
    ConstraintLevel.NO_REMATCH,
    ConstraintLevel.NO_PARTIAL_SAME_CLUB,
    ConstraintLevel.NO_SAME_CLUB,
    ConstraintLevel.NO_CONTRAINTE,
];

// Construit l'échelle de niveaux à essayer : d'abord ceux qui respectent la config
// (du plus strict au moins strict), puis en dernier recours ceux qui la violent.
export function buildConstraintLadder(config: ConstraintConfig): ConstraintLevel[] {
    const requiredClub: 'none' | 'full' | 'partial' = !config.allowMatchAgainstPartialSameClub
        ? 'partial'
        : !config.allowMatchAgainstFullSameClub
          ? 'full'
          : 'none';
    const requiredRematchCheck = !config.allowRematch;

    const satisfiesClub = (level: ConstraintLevel): boolean => {
        if (requiredClub === 'none') return true;
        if (requiredClub === 'full') return CLUB_STRENGTH[level] !== 'none';
        return CLUB_STRENGTH[level] === 'partial';
    };
    const isCompliant = (level: ConstraintLevel): boolean =>
        (!requiredRematchCheck || CHECKS_REMATCH[level]) && satisfiesClub(level);

    const relaxableLevels = STRICTNESS_ORDER.filter((l) => l !== ConstraintLevel.NO_CONTRAINTE);
    const compliant = relaxableLevels.filter(isCompliant);
    const nonCompliant = relaxableLevels.filter((l) => !isCompliant(l));

    return [...compliant, ...nonCompliant, ConstraintLevel.NO_CONTRAINTE];
}
