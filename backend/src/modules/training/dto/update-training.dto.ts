import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateTrainingDto {
    @IsString()
    @IsNotEmpty()
    password!: string;

    @IsString()
    @IsOptional()
    name?: string;

    @IsString()
    @IsOptional()
    club?: string;
}
