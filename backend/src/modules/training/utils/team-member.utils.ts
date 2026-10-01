import { TrainingTeamMember } from 'src/entities/training-team-member.entity';

// "Active" = not detached from the team (non-destructive dissolution, product decision). A single
// place for this definition rather than `!m.leftAt` rewritten at every call site.
export function isActiveMember(member: TrainingTeamMember): boolean {
    return !member.leftAt;
}

export function activeMembers(members: TrainingTeamMember[] | undefined): TrainingTeamMember[] {
    return (members ?? []).filter(isActiveMember);
}
