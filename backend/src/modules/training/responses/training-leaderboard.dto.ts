// Leaderboard by PARTICIPANT only (never by team, not even a fixed one). Full credit (no split) to
// every member of a winning team.
export interface TrainingLeaderboardEntryDto {
    participantId: string;
    name: string;
    wins: number;
    points: number;
}
