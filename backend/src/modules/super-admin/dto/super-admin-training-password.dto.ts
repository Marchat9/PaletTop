import { IsNotEmpty, IsString } from 'class-validator';
import { SuperAdminActionDto } from './super-admin-action.dto';

export class SuperAdminTrainingPasswordDto extends SuperAdminActionDto {
    @IsString()
    @IsNotEmpty()
    newPassword!: string;
}
