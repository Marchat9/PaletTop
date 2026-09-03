import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

// Soit memberId (réutilise le roster du Training), soit name (venue en découverte) — validé
// dans le service, pas ici (au moins un des deux doit être fourni).
export class CheckinParticipantDto {
    @IsString()
    @IsNotEmpty()
    password!: string;

    @IsUUID()
    @IsOptional()
    memberId?: string;

    @IsString()
    @IsOptional()
    name?: string;
}
