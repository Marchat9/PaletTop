// Leaderboard by PARTICIPANT only (never by team, not even a fixed one). Full credit (no split) to
// every member of a winning team.
/**
 * Club leaderboard: the plain sum, over every session of the club, of the wins and points of each
 * roster member. Guests, who exist only within a session, are left out.
 */
export interface TrainingClubLeaderboardEntryDto {
    memberId: string;
    name: string;
    wins: number;
    points: number;
}

export interface TrainingLeaderboardEntryDto {
    participantId: string;
    name: string;
    wins: number;
    points: number;
}
