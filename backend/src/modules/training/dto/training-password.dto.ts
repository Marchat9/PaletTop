import { IsNotEmpty, IsString } from 'class-validator';

// DTO réutilisé pour tous les endpoints admin qui n'ont besoin que de vérifier le mot de passe
// (retrait de membre, dissolution d'équipe, clôture de session, etc.).
export class TrainingPasswordDto {
    @IsString()
    @IsNotEmpty()
    password!: string;
}
