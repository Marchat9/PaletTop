import { TournamentConfigurationDetailsDto } from './tournament-configuration-detail.model';

export interface TournamentConfigurationDto {
  name: string;
  code: string;
  adminPassword: string;
  date: Date;
  description?: string;
  configuration: TournamentConfigurationDetailsDto;
}
