import { ArrayNotEmpty, IsArray, IsUUID } from 'class-validator';
import { SuperAdminActionDto } from './super-admin-action.dto';

export class SuperAdminIdsDto extends SuperAdminActionDto {
    @IsArray()
    @ArrayNotEmpty()
    @IsUUID('4', { each: true })
    ids!: string[];
}
