import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { SuperAdminActionDto } from './super-admin-action.dto';

// Champs de pagination/recherche communs aux listes admin (trainings, tournaments) — `sortBy`
// (valeurs sortables différentes par entité) et les filtres propres à une entité (ex. `status`
// pour les tournois) restent dans chaque sous-classe.
export abstract class SuperAdminSearchBaseDto extends SuperAdminActionDto {
    @IsInt()
    @Min(1)
    page!: number;

    @IsInt()
    @Min(1)
    pageSize!: number;

    @IsOptional()
    @IsString()
    search?: string;

    @IsOptional()
    @IsIn(['ASC', 'DESC'])
    sortDir?: 'ASC' | 'DESC';
}
