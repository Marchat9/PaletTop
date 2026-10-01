import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateTrainingDto {
    @IsString()
    @IsNotEmpty()
    code!: string;

    @IsString()
    @IsNotEmpty()
    name!: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsString()
    @IsNotEmpty()
    adminPassword!: string;
}
