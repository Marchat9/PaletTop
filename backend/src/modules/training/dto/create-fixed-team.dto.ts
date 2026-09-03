import { ArrayMinSize, IsArray, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateFixedTeamDto {
    @IsString()
    @IsNotEmpty()
    password!: string;

    @IsArray()
    @ArrayMinSize(1)
    @IsUUID('4', { each: true })
    participantIds!: string[];

    @IsString()
    @IsOptional()
    name?: string;
}
