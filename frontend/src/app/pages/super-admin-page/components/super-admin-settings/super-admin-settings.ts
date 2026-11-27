import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  linkedSignal,
  output,
} from '@angular/core';
import {
  AppSettingDetailDto,
  AppSettingKey,
  AppSettingValues,
  CleanupRuleConfig,
  ScoreCalculationsByMode,
  TournamentCleanupConfig,
  TrainingAutoCloseConfig,
  TrainingCleanupConfig,
} from 'src/app/models/app-setting.model';
import {
  CompetitionMode,
  ScoreCalculation,
} from 'src/app/models/tournament-configuration-detail.model';
import { FillThresholds } from 'src/app/models/tournament-plan.model';
import { CardCollapsible } from 'src/app/shared/card-collapsible/card-collapsible';
import { Icon } from 'src/app/shared/icon/icon';
import { InputCardCheckbox } from 'src/app/shared/input-card-checkbox/input-card-checkbox';
import { InputCardRadioOption } from 'src/app/shared/input-card-radio/input-card-radio';
import { InputNumber } from 'src/app/shared/input-number/input-number';
import { InputText } from 'src/app/shared/input-text/input-text';
import { Switch } from 'src/app/shared/switch/switch';
import { ThresholdGauge } from 'src/app/shared/threshold-gauge/threshold-gauge';
import {
  competitionModeOptions,
  scoreCalculationOptions,
} from 'src/app/shared/tournament-configuration/tournament-create.data';
import { CronFieldsComponent } from './cron-fields/cron-fields';
import { SettingFooterComponent, SettingMeta } from './setting-footer/setting-footer';

export interface AppSettingChange {
  key: AppSettingKey;
  value: unknown;
}

/** Tournament cleanup rules, in display order. */
type CleanupRuleName = 'completed' | 'draft' | 'active';

interface ModeScoreCalculations {
  mode: CompetitionMode;
  label: string;
  selected: ScoreCalculation[];
}

interface CleanupRuleView {
  name: CleanupRuleName;
  label: string;
  rule: CleanupRuleConfig;
  maxFutureDays: number | null;
}

const CLEANUP_RULE_LABELS: Record<CleanupRuleName, string> = {
  completed: 'Tournois terminés',
  draft: 'Tournois brouillons',
  active: 'Tournois actifs',
};

const MIN_CONSOLATION_COUNT = 1;
const MAX_CONSOLATION_COUNT_LIMIT = 26;
const MIN_BYE_LOSER_SCORE_CAP = 0;
const MAX_BYE_LOSER_SCORE_CAP = 12;
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

const SOURCE_LABELS: Record<AppSettingDetailDto['source'], string> = {
  app_default: 'Valeur par défaut',
  super_admin: 'Modifié par le super-admin',
  migration: 'Migration',
  env: "Variable d'environnement",
};

function sourceLabel(detail: AppSettingDetailDto): string {
  const label = SOURCE_LABELS[detail.source];
  return detail.sourceDetail ? `${label} (${detail.sourceDetail})` : label;
}

@Component({
  selector: 'app-super-admin-settings',
  imports: [
    CardCollapsible,
    CronFieldsComponent,
    Icon,
    InputCardCheckbox,
    SettingFooterComponent,
    InputNumber,
    InputText,
    Switch,
    ThresholdGauge,
  ],
  templateUrl: './super-admin-settings.html',
  styleUrl: './super-admin-settings.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SuperAdminSettingsComponent {
  public readonly settings = input<AppSettingDetailDto[]>([]);
  public readonly savingKey = input<AppSettingKey | null>(null);

  public readonly settingSave = output<AppSettingChange>();
  public readonly settingReset = output<AppSettingKey>();

  /** Values being edited, reset whenever the stored settings change. */
  private readonly drafts = linkedSignal<Partial<AppSettingValues>>(() =>
    Object.fromEntries(
      this.settings().map((setting) => [setting.key, structuredClone(setting.value)]),
    ),
  );

  public readonly maxConsolationCountLimit = MAX_CONSOLATION_COUNT_LIMIT;
  public readonly byeLoserScoreCapMin = MIN_BYE_LOSER_SCORE_CAP;
  public readonly byeLoserScoreCapMax = MAX_BYE_LOSER_SCORE_CAP;

  public readonly scoreCalculationOptions: InputCardRadioOption<ScoreCalculation>[] =
    scoreCalculationOptions;

  public readonly meta = computed<Partial<Record<AppSettingKey, SettingMeta>>>(() => {
    const drafts = this.drafts();
    return Object.fromEntries(
      this.settings().map((setting) => [
        setting.key,
        {
          sourceLabel: sourceLabel(setting),
          appVersion: setting.appVersion,
          updatedAt: setting.updatedAt,
          isDirty: JSON.stringify(drafts[setting.key]) !== JSON.stringify(setting.value),
          isSaving: this.savingKey() === setting.key,
        },
      ]),
    );
  });

  public readonly scoreCalculationsByMode = computed<ModeScoreCalculations[]>(() => {
    const value = this.drafts().score_calculations_by_mode;
    if (!value) return [];
    return competitionModeOptions.map((option) => ({
      mode: option.value as CompetitionMode,
      label: option.label,
      selected: value[option.value as CompetitionMode] ?? [],
    }));
  });

  public readonly tournamentCleanup = computed(() => this.drafts().tournament_cleanup ?? null);
  public readonly tournamentCleanupRules = computed<CleanupRuleView[]>(() => {
    const cleanup = this.tournamentCleanup();
    if (!cleanup) return [];
    return (Object.keys(CLEANUP_RULE_LABELS) as CleanupRuleName[]).map((name) => ({
      name,
      label: CLEANUP_RULE_LABELS[name],
      rule: cleanup[name],
      maxFutureDays: name === 'draft' ? cleanup.draft.maxFutureDays : null,
    }));
  });
  public readonly trainingCleanup = computed(() => this.drafts().training_cleanup ?? null);
  public readonly trainingAutoClose = computed(() => this.drafts().training_auto_close ?? null);
  public readonly levelHistoryDepth = computed(
    () => this.drafts().training_level_history_depth ?? null,
  );

  public readonly maxConsolationCount = computed(() => this.drafts().max_consolation_count ?? null);
  public readonly byeLoserScoreCap = computed(() => this.drafts().bye_loser_score_cap ?? null);
  public readonly consolationPreview = computed(() =>
    [
      'Principale',
      ...[...ALPHABET.slice(0, this.maxConsolationCount() ?? 0)].map((l) => `Consolante ${l}`),
    ].join(' · '),
  );
  public readonly fillThresholds = computed(() => this.drafts().bracket_fill_thresholds ?? null);

  // ========= Draft edits =========

  private patchDraft<K extends AppSettingKey>(key: K, value: AppSettingValues[K]): void {
    this.drafts.update((drafts) => ({ ...drafts, [key]: value }));
  }

  onScoreCalculationsChange(mode: CompetitionMode, selected: ScoreCalculation[]): void {
    const current = this.drafts().score_calculations_by_mode;
    if (!current) return;
    const next: ScoreCalculationsByMode = { ...current, [mode]: selected };
    this.patchDraft('score_calculations_by_mode', next);
  }

  onTournamentCleanupChange(patch: Partial<TournamentCleanupConfig>): void {
    const current = this.tournamentCleanup();
    if (!current) return;
    this.patchDraft('tournament_cleanup', { ...current, ...patch });
  }

  onTournamentCleanupRuleChange(name: CleanupRuleName, patch: Partial<CleanupRuleConfig>): void {
    const current = this.tournamentCleanup();
    if (!current) return;
    this.patchDraft('tournament_cleanup', { ...current, [name]: { ...current[name], ...patch } });
  }

  onDraftMaxFutureDaysChange(maxFutureDays: number): void {
    const current = this.tournamentCleanup();
    if (!current) return;
    this.patchDraft('tournament_cleanup', {
      ...current,
      draft: { ...current.draft, maxFutureDays },
    });
  }

  onTrainingCleanupChange(patch: Partial<TrainingCleanupConfig>): void {
    const current = this.trainingCleanup();
    if (!current) return;
    this.patchDraft('training_cleanup', { ...current, ...patch });
  }

  onTrainingAutoCloseChange(patch: Partial<TrainingAutoCloseConfig>): void {
    const current = this.trainingAutoClose();
    if (!current) return;
    this.patchDraft('training_auto_close', { ...current, ...patch });
  }

  onLevelHistoryDepthChange(depth: number): void {
    this.patchDraft('training_level_history_depth', depth);
  }

  onMaxConsolationCountChange(count: number): void {
    const clamped = Math.min(MAX_CONSOLATION_COUNT_LIMIT, Math.max(MIN_CONSOLATION_COUNT, count));
    this.patchDraft('max_consolation_count', clamped);
  }

  onByeLoserScoreCapChange(cap: number): void {
    const clamped = Math.min(MAX_BYE_LOSER_SCORE_CAP, Math.max(MIN_BYE_LOSER_SCORE_CAP, cap));
    this.patchDraft('bye_loser_score_cap', clamped);
  }

  onFillThresholdsChange(patch: Partial<FillThresholds>): void {
    const current = this.fillThresholds();
    if (!current) return;
    this.patchDraft('bracket_fill_thresholds', { ...current, ...patch });
  }

  // ========= Actions =========

  onSave(key: AppSettingKey): void {
    this.settingSave.emit({ key, value: this.drafts()[key] });
  }

  onReset(key: AppSettingKey): void {
    this.settingReset.emit(key);
  }
}
