import { Player } from 'src/entities/player.entity';
import { Column, Entity, JoinColumn, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

@Entity('player_club')
export class PlayerClub {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ unique: true, length: 150 })
    name!: string;

    @OneToMany(() => Player, (player: Player) => player.club, {
        nullable: false,
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'player_id' })
    player!: Player;
}
