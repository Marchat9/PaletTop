import { IsNotEmpty, IsString } from 'class-validator';

// DTO reused by every admin endpoint that only needs to check the password (remove a member,
// dissolve a team, close a session, and so on).
export class TrainingPasswordDto {
    @IsString()
    @IsNotEmpty()
    password!: string;
}
