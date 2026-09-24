import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { trimmed } from 'src/utils/trim.transform';

// Soit memberId (réutilise le roster du Training), soit name (venue en découverte) — validé
// dans le service, pas ici (au moins un des deux doit être fourni).
export class CheckinParticipantDto {
    @IsString()
    @IsNotEmpty()
    password!: string;

    @IsUUID()
    @IsOptional()
    memberId?: string;

    // Un nom d'espaces ne vaut pas un nom : on le ramène à une chaîne vide, que `IsNotEmpty`
    // rejette ensuite. La borne à 100 est celle de la colonne, sans quoi l'insertion part en 500.
    @Transform(trimmed)
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    @IsOptional()
    name?: string;
}
