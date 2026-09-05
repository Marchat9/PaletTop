import { TrainingTeamMember } from 'src/entities/training-team-member.entity';

// "Actif" = pas détaché de l'équipe (dissolution non destructive, cf. décision produit). Un seul
// endroit pour cette définition plutôt que `!m.leftAt` réécrit à chaque site d'appel.
export function isActiveMember(member: TrainingTeamMember): boolean {
    return !member.leftAt;
}

export function activeMembers(members: TrainingTeamMember[] | undefined): TrainingTeamMember[] {
    return (members ?? []).filter(isActiveMember);
}
