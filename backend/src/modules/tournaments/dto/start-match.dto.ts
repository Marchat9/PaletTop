import { IsNotEmpty, IsString } from 'class-validator';

export class StartMatchDto {
    @IsString()
    @IsNotEmpty()
    teamCode!: string;
}
