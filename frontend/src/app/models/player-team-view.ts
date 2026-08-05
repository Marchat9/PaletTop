import { Nullable } from './nullable.model';

export interface TeamMatchView {
  countdown: string;
  opponent: string;
  date: string;
  location: string;
}

export interface TeamResultView {
  id: string;
  date: Date;
  sessionNumber: number;
  currentTeamScore: number;
  opponentTeamName: string;
  opponentScore: number;
  status: string;
}

export interface TeamMemberView {
  name: string;
  club: Nullable<string>;
  role: string;
  precision: string;
  imageSrc: string;
}

export interface TeamView {
  id: string;
  code: Nullable<string>;
  name: string;
  stats: {
    wins: string;
    rank: string;
  };
  nextMatch: TeamMatchView;
  recentResults: TeamResultView[];
  members: TeamMemberView[];
}
