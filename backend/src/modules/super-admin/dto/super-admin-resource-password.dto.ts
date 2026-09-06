import { IsNotEmpty, IsString } from 'class-validator';
import { SuperAdminActionDto } from './super-admin-action.dto';

// Réinitialisation du mot de passe admin d'une ressource (training ou tournament) — même forme
// pour les deux, l'authentification super-admin elle-même (guard/service) est déjà unique et
// partagée entre les deux domaines, cf. SuperAdminAuthGuard.
export class SuperAdminResourcePasswordDto extends SuperAdminActionDto {
    @IsString()
    @IsNotEmpty()
    newPassword!: string;
}
