import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { trimmed } from 'src/utils/trim.transform';

// Either memberId (reuses the Training roster) or name (drop-in player) - checked in the service,
// not here (at least one of the two must be given).
export class CheckinParticipantDto {
    @IsString()
    @IsNotEmpty()
    password!: string;

    @IsUUID()
    @IsOptional()
    memberId?: string;

    // A name made of spaces is not a name: it is reduced to an empty string, which `IsNotEmpty`
    // then rejects. The 100 bound is the column's, without it the insert ends in a 500.
    @Transform(trimmed)
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    @IsOptional()
    name?: string;
}
