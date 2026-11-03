import { IsOptional, IsUUID } from 'class-validator';
import { TrainingPasswordDto } from './training-password.dto';

// No memberId (or null): the group no longer has a member who is also its admin.
export class SetTrainingAdminMemberDto extends TrainingPasswordDto {
    @IsOptional()
    @IsUUID()
    memberId?: string | null;
}
