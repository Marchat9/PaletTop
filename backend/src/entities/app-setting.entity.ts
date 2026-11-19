import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { AppSettingScope, AppSettingSource } from 'src/enum/app-setting.enum';

/** A key/value setting of the application, typed in code by `APP_SETTING_DEFINITIONS`. */
@Entity('app_setting')
export class AppSetting {
    @PrimaryColumn({ type: 'varchar' })
    key!: string;

    @Column({ type: 'jsonb' })
    value!: unknown;

    @Column({ type: 'enum', enum: AppSettingScope })
    scope!: AppSettingScope;

    @Column({ type: 'enum', enum: AppSettingSource })
    source!: AppSettingSource;

    /** Migration name, env var names… */
    @Column({ type: 'varchar', nullable: true })
    sourceDetail!: string | null;

    /** APP_VERSION of the running app when the value was written. */
    @Column({ type: 'varchar', nullable: true })
    appVersion!: string | null;

    @UpdateDateColumn({ type: 'timestamptz' })
    updatedAt!: Date;
}
