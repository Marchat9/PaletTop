import { IsIn } from 'class-validator';
import { TournamentStatus } from 'src/enum/status.enum';
import { SuperAdminIdsDto } from './super-admin-ids.dto';

export class SuperAdminTournamentStatusDto extends SuperAdminIdsDto {
    @IsIn(Object.values(TournamentStatus))
    status!: TournamentStatus;
}
