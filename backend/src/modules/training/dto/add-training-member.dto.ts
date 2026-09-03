import { IsNotEmpty, IsString } from 'class-validator';

export class AddTrainingMemberDto {
    @IsString()
    @IsNotEmpty()
    password!: string;

    @IsString()
    @IsNotEmpty()
    name!: string;
}
