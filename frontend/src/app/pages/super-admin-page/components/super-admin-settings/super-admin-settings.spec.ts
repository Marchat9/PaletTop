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
  { ...detail('max_consolation_count', 4), scope: 'public' },
  { ...detail('bracket_fill_thresholds', { okRatio: 0.9, warningRatio: 0.75 }), scope: 'public' },
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

  describe('max consolation count', () => {
    it('previews the bracket names', () => {
      expect(component.maxConsolationCount()).toBe(4);
      expect(component.consolationPreview()).toBe(
        'Principale · Consolante A · Consolante B · Consolante C · Consolante D',
      );
    });

    it('clamps the value to 1..26', () => {
      component.onMaxConsolationCountChange(40);
      expect(component.maxConsolationCount()).toBe(26);
      component.onMaxConsolationCountChange(0);
      expect(component.maxConsolationCount()).toBe(1);
      expect(component.consolationPreview()).toBe('Principale · Consolante A');
    });

    it('saves its own setting only', () => {
      component.onMaxConsolationCountChange(6);
      component.onSave('max_consolation_count');
      expect(saved).toEqual([{ key: 'max_consolation_count', value: 6 }]);
      expect(component.meta().bracket_fill_thresholds?.isDirty).toBe(false);
    });
  });

  describe('fill thresholds', () => {
    it('edits one threshold and keeps the other', () => {
      component.onFillThresholdsChange({ warningRatio: 0.7 });
      expect(component.fillThresholds()).toEqual({ okRatio: 0.9, warningRatio: 0.7 });
      expect(component.meta().bracket_fill_thresholds?.isDirty).toBe(true);
    });

    it('saves the whole thresholds object under its own key', () => {
      component.onFillThresholdsChange({ okRatio: 0.95 });
      component.onSave('bracket_fill_thresholds');
      expect(saved).toEqual([
        { key: 'bracket_fill_thresholds', value: { okRatio: 0.95, warningRatio: 0.75 } },
      ]);
      expect(component.meta().max_consolation_count?.isDirty).toBe(false);
    });
  });
});
