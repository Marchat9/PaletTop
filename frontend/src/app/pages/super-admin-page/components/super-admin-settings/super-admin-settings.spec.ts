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
      standard: ['victory_goal_average', 'victory_points_scored'],
      up_down: ['victory_goal_average', 'victory_points_scored'],
      championship: ['tournament_score'],
    }),
    scope: 'public',
  },
  detail('training_level_history_depth', 5),
  { ...detail('max_consolation_count', 4), scope: 'public' },
  { ...detail('bye_loser_score_cap', 6), scope: 'internal' },
  { ...detail('bracket_fill_thresholds', { okRatio: 0.9, warningRatio: 0.75 }), scope: 'public' },
  {
    ...detail('recommended_options', {
      scoreCalculation: 'victory_goal_average',
      pairingMode: 'dutch',
      eliminationSeeding: 'pyramidal',
    }),
    scope: 'public',
  },
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

    component.onScoreCalculationsChange('up_down', ['victory_points_scored']);
    expect(component.meta().score_calculations_by_mode?.isDirty).toBe(true);

    component.onSave('score_calculations_by_mode');
    expect(saved).toEqual([
      {
        key: 'score_calculations_by_mode',
        value: {
          standard: ['victory_goal_average', 'victory_points_scored'],
          up_down: ['victory_points_scored'],
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

  describe('bye loser score cap', () => {
    it('comes right after the recommended options', () => {
      const titles = Array.from(
        fixture.nativeElement.querySelectorAll('.setting-title') as NodeListOf<HTMLElement>,
        (title) => title.textContent?.trim(),
      );
      const recommended = titles.indexOf('Options recommandées');

      expect(recommended).toBeGreaterThanOrEqual(0);
      expect(titles[recommended + 1]).toBe("Score du perdant d'un bye (plafond)");
    });

    it('shows the stored cap', () => {
      expect(component.byeLoserScoreCap()).toBe(6);
    });

    it('clamps the value to 0..12', () => {
      component.onByeLoserScoreCapChange(40);
      expect(component.byeLoserScoreCap()).toBe(12);
      component.onByeLoserScoreCapChange(-3);
      expect(component.byeLoserScoreCap()).toBe(0);
    });

    it('saves its own setting only', () => {
      component.onByeLoserScoreCapChange(8);
      component.onSave('bye_loser_score_cap');
      expect(saved).toEqual([{ key: 'bye_loser_score_cap', value: 8 }]);
      expect(component.meta().max_consolation_count?.isDirty).toBe(false);
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

  describe('recommended options', () => {
    it('offers « Aucune » before the options of each choice', () => {
      expect(component.recommendedPairingModeChoices.map((choice) => choice.value)).toEqual([
        null,
        'dutch',
        'neighbors',
        'random',
      ]);
    });

    it('changes one recommendation, keeps the others and saves them together', () => {
      component.onRecommendedOptionsChange({ pairingMode: null });
      expect(component.meta().recommended_options?.isDirty).toBe(true);

      component.onSave('recommended_options');
      expect(saved).toEqual([
        {
          key: 'recommended_options',
          value: {
            scoreCalculation: 'victory_goal_average',
            pairingMode: null,
            eliminationSeeding: 'pyramidal',
          },
        },
      ]);
    });
  });
});
