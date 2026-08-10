import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { SuperAdminActionDto } from './super-admin-action.dto';

export class SuperAdminClubRenameDto extends SuperAdminActionDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(150)
    name!: string;
}
