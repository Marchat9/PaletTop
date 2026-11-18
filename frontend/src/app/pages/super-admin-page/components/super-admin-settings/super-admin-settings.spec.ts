import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AppSettingDetailDto } from 'src/app/models/app-setting.model';
import { AppSettingChange, SuperAdminSettingsComponent } from './super-admin-settings';

function detail(key: AppSettingDetailDto['key'], value: unknown): AppSettingDetailDto {
  return {
    key,
    value,
    scope: 'internal',
    source: 'app_default',
    sourceDetail: null,
    appVersion: null,
    updatedAt: null,
  };
}

const SETTINGS: AppSettingDetailDto[] = [
  {
    ...detail('score_calculations_by_mode', {
      standard: ['victory_ga', 'score'],
      up_down: ['victory_ga', 'score'],
      championship: ['tournament_score'],
    }),
    scope: 'public',
  },
  detail('training_level_history_depth', 5),
  {
    ...detail('training_cleanup', { enabled: true, cronExpression: '0 6 * * 1', retentionDays: 7 }),
    source: 'env',
    sourceDetail: 'TRAINING_CLEANUP_RETENTION_DAYS',
  },
];

describe('SuperAdminSettingsComponent', () => {
  let fixture: ComponentFixture<SuperAdminSettingsComponent>;
  let component: SuperAdminSettingsComponent;
  let saved: AppSettingChange[];

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [SuperAdminSettingsComponent] });
    fixture = TestBed.createComponent(SuperAdminSettingsComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('settings', SETTINGS);
    saved = [];
    component.settingSave.subscribe((change) => saved.push(change));
    fixture.detectChanges();
  });

  it('shows every competition mode with its offered calculations', () => {
    expect(component.scoreCalculationsByMode().map((mode) => mode.mode)).toEqual([
      'standard',
      'up_down',
      'championship',
    ]);
    expect(component.scoreCalculationsByMode()[2].selected).toEqual(['tournament_score']);
  });

  it('describes where each value comes from', () => {
    expect(component.meta().training_cleanup?.sourceLabel).toBe(
      "Variable d'environnement (TRAINING_CLEANUP_RETENTION_DAYS)",
    );
    expect(component.meta().training_level_history_depth?.sourceLabel).toBe('Valeur par défaut');
  });

  it('marks an edited setting dirty and saves the edited value', () => {
    expect(component.meta().score_calculations_by_mode?.isDirty).toBe(false);

    component.onScoreCalculationsChange('up_down', ['score']);
    expect(component.meta().score_calculations_by_mode?.isDirty).toBe(true);

    component.onSave('score_calculations_by_mode');
    expect(saved).toEqual([
      {
        key: 'score_calculations_by_mode',
        value: {
          standard: ['victory_ga', 'score'],
          up_down: ['score'],
          championship: ['tournament_score'],
        },
      },
    ]);
  });

  it('drops the draft when the stored settings change', () => {
    component.onLevelHistoryDepthChange(9);
    expect(component.levelHistoryDepth()).toBe(9);

    fixture.componentRef.setInput('settings', [...SETTINGS]);
    expect(component.levelHistoryDepth()).toBe(5);
  });
});
