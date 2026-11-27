export enum AppSettingKey {
    SCORE_CALCULATIONS_BY_MODE = 'score_calculations_by_mode',
    TOURNAMENT_CLEANUP = 'tournament_cleanup',
    TRAINING_CLEANUP = 'training_cleanup',
    TRAINING_AUTO_CLOSE = 'training_auto_close',
    TRAINING_LEVEL_HISTORY_DEPTH = 'training_level_history_depth',
    MAX_CONSOLATION_COUNT = 'max_consolation_count',
    BRACKET_FILL_THRESHOLDS = 'bracket_fill_thresholds',
    BYE_LOSER_SCORE_CAP = 'bye_loser_score_cap',
    RECOMMENDED_OPTIONS = 'recommended_options',
}

/** Who may read a setting through the API. */
export enum AppSettingScope {
    /** Returned to everyone by the public API. */
    PUBLIC = 'public',
    /** Returned and editable only through the super-admin API. */
    SUPER_ADMIN = 'super_admin',
    /** Read by the backend; visible and editable by the super-admin only. */
    INTERNAL = 'internal',
}

/** Where the stored value comes from. */
export enum AppSettingSource {
    APP_DEFAULT = 'app_default',
    SUPER_ADMIN = 'super_admin',
    MIGRATION = 'migration',
    ENV = 'env',
}
