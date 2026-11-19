import { BadRequestException, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { filter, Subject, Subscription } from 'rxjs';
import { Repository } from 'typeorm';
import { AppSetting } from 'src/entities/app-setting.entity';
import { AppSettingKey, AppSettingScope, AppSettingSource } from 'src/enum/app-setting.enum';
import { APP_SETTING_DEFINITIONS, AppSettingValues } from './app-setting.definitions';
import { AppSettingDetailDto, PublicAppSettingDto } from './app-setting.dto';

export interface AppSettingChange<K extends AppSettingKey = AppSettingKey> {
    key: K;
    value: AppSettingValues[K];
}

/** Value to store when nothing valid is stored: the env value if valid, else the code default. */
interface FallbackValue<K extends AppSettingKey> {
    value: AppSettingValues[K];
    source: AppSettingSource.ENV | AppSettingSource.APP_DEFAULT;
    sourceDetail: string | null;
}

/** JSON with sorted keys: jsonb does not keep the key order, so a plain stringify can't compare. */
export function stableStringify(value: unknown): string {
    if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
    if (typeof value === 'object' && value !== null) {
        const entries = Object.entries(value as Record<string, unknown>)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`);
        return `{${entries.join(',')}}`;
    }
    return JSON.stringify(value);
}

function sameValue(a: unknown, b: unknown): boolean {
    return stableStringify(a) === stableStringify(b);
}

@Injectable()
export class AppSettingsService implements OnModuleInit {
    private readonly logger = new Logger(AppSettingsService.name);

    /** Emitted after each update or reset, so consumers apply a change without a restart. */
    readonly changes$ = new Subject<AppSettingChange>();

    constructor(
        @InjectRepository(AppSetting)
        private readonly settingRepo: Repository<AppSetting>,
    ) {}

    async onModuleInit(): Promise<void> {
        await this.initialize();
    }

    /** Creates the missing rows and reconciles the stored ones with the registry and the env. */
    async initialize(): Promise<void> {
        const rows = await this.settingRepo.find();
        const rowsByKey = new Map(rows.map((row) => [row.key, row]));

        for (const key of Object.values(AppSettingKey)) {
            await this.initializeKey(key, rowsByKey.get(key));
        }

        const knownKeys = Object.values(AppSettingKey) as string[];
        for (const row of rows.filter((r) => !knownKeys.includes(r.key))) {
            this.logger.warn(`Paramètre inconnu ignoré : « ${row.key} » (absent du code)`);
        }
    }

    private async initializeKey<K extends AppSettingKey>(
        key: K,
        row: AppSetting | undefined,
    ): Promise<void> {
        const definition = APP_SETTING_DEFINITIONS[key];

        if (!row) {
            await this.write(key, this.resolveFallback(key));
            return;
        }

        if (row.scope !== definition.scope) {
            row.scope = definition.scope;
            await this.settingRepo.save(row);
            this.logger.log(`Paramètre « ${key} » : portée mise à jour (${definition.scope})`);
        }

        const errors = definition.validate(row.value);
        if (errors.length) {
            this.logger.error(
                `Paramètre « ${key} » invalide en base, remplacé : ${errors.join(' ')}`,
            );
            await this.write(key, this.resolveFallback(key));
            return;
        }

        const env = this.readValidEnv(key);
        if (!env || sameValue(env.value, row.value)) return;

        if (row.source === AppSettingSource.ENV) {
            await this.write(key, {
                value: env.value,
                source: AppSettingSource.ENV,
                sourceDetail: env.sourceDetail,
            });
            return;
        }
        this.logger.warn(
            `Paramètre « ${key} » : la variable d'environnement (${env.sourceDetail}) est ignorée, la valeur enregistrée (${row.source}) est conservée`,
        );
    }

    /** Calls `listener` with the new value each time `key` is updated or reset. */
    watch<K extends AppSettingKey>(
        key: K,
        listener: (value: AppSettingValues[K]) => void,
    ): Subscription {
        return this.changes$
            .pipe(filter((change) => change.key === key))
            .subscribe((change) => listener(change.value as AppSettingValues[K]));
    }

    /** The current value: the stored one if valid, else the env value, else the code default. */
    async get<K extends AppSettingKey>(key: K): Promise<AppSettingValues[K]> {
        const row = await this.settingRepo.findOneBy({ key });
        if (row && !APP_SETTING_DEFINITIONS[key].validate(row.value).length) {
            return row.value as AppSettingValues[K];
        }
        return this.resolveFallback(key).value;
    }

    async findPublic(): Promise<PublicAppSettingDto[]> {
        const details = await this.findAll();
        return details
            .filter((detail) => detail.scope === AppSettingScope.PUBLIC)
            .map(({ key, value }) => ({ key, value }));
    }

    /** Every setting of the registry, with its audit fields (super-admin only). */
    async findAll(): Promise<AppSettingDetailDto[]> {
        const rows = await this.settingRepo.find();
        const rowsByKey = new Map(rows.map((row) => [row.key, row]));

        return Object.values(AppSettingKey).map((key) => {
            const row = rowsByKey.get(key);
            const definition = APP_SETTING_DEFINITIONS[key];
            if (row && !definition.validate(row.value).length) {
                return {
                    key,
                    value: row.value,
                    scope: definition.scope,
                    source: row.source,
                    sourceDetail: row.sourceDetail,
                    appVersion: row.appVersion,
                    updatedAt: row.updatedAt,
                };
            }
            const fallback = this.resolveFallback(key);
            return {
                key,
                value: fallback.value,
                scope: definition.scope,
                source: fallback.source,
                sourceDetail: fallback.sourceDetail,
                appVersion: null,
                updatedAt: null,
            };
        });
    }

    async update<K extends AppSettingKey>(key: K, value: unknown): Promise<AppSettingDetailDto> {
        const errors = APP_SETTING_DEFINITIONS[key].validate(value);
        if (errors.length) {
            throw new BadRequestException(errors.join(' '));
        }
        const saved = await this.write(key, {
            value: value as AppSettingValues[K],
            source: AppSettingSource.SUPER_ADMIN,
            sourceDetail: null,
        });
        this.changes$.next({ key, value: value as AppSettingValues[K] });
        return saved;
    }

    /** Back to the env value when it is set and valid, else to the code default. */
    async reset<K extends AppSettingKey>(key: K): Promise<AppSettingDetailDto> {
        const fallback = this.resolveFallback(key);
        const saved = await this.write(key, fallback);
        this.changes$.next({ key, value: fallback.value });
        return saved;
    }

    private async write<K extends AppSettingKey>(
        key: K,
        entry: {
            value: AppSettingValues[K];
            source: AppSettingSource;
            sourceDetail: string | null;
        },
    ): Promise<AppSettingDetailDto> {
        const saved = await this.settingRepo.save({
            key,
            value: entry.value,
            scope: APP_SETTING_DEFINITIONS[key].scope,
            source: entry.source,
            sourceDetail: entry.sourceDetail,
            appVersion: process.env.APP_VERSION || null,
        });
        this.logger.log(
            `Paramètre « ${key} » enregistré (source : ${entry.source}${entry.sourceDetail ? `, ${entry.sourceDetail}` : ''})`,
        );
        return {
            key,
            value: saved.value,
            scope: saved.scope,
            source: saved.source,
            sourceDetail: saved.sourceDetail ?? null,
            appVersion: saved.appVersion ?? null,
            updatedAt: saved.updatedAt ?? null,
        };
    }

    private readValidEnv<K extends AppSettingKey>(
        key: K,
    ): { value: AppSettingValues[K]; sourceDetail: string } | undefined {
        const definition = APP_SETTING_DEFINITIONS[key];
        const env = definition.readEnv?.(process.env);
        if (!env) return undefined;
        const errors = definition.validate(env.value);
        if (errors.length) {
            this.logger.error(
                `Paramètre « ${key} » : variable d'environnement invalide ignorée (${env.sourceDetail}) : ${errors.join(' ')}`,
            );
            return undefined;
        }
        return env;
    }

    private resolveFallback<K extends AppSettingKey>(key: K): FallbackValue<K> {
        const env = this.readValidEnv(key);
        if (env) {
            return {
                value: env.value,
                source: AppSettingSource.ENV,
                sourceDetail: env.sourceDetail,
            };
        }
        return {
            value: APP_SETTING_DEFINITIONS[key].defaultValue,
            source: AppSettingSource.APP_DEFAULT,
            sourceDetail: null,
        };
    }
}
