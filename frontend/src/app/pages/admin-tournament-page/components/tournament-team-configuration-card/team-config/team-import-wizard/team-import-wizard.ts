import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { environment } from '@environment';
import { Nullable } from 'src/app/models/nullable.model';
import { TeamConfigCreateTeamPayload } from 'src/app/models/team-config.model';
import { ButtonIcon } from 'src/app/shared/button-icon/button-icon';
import { Icon } from 'src/app/shared/icon/icon';
import {
  downloadBlob,
  generateTeamsExcelTemplate,
  getTemplateHeaders,
  ParsedTeamRow,
  parseTeamsExcelFile,
} from '../team-excel.utils';
import {
  buildImportBlockReason,
  classifyImportRows,
  computeImportCapacity,
  countImportRows,
  filterImportRows,
  ImportRowFilter,
  toImportPayload,
} from '../team-import.utils';
import {
  TeamImportFileError,
  TeamImportFileStep,
} from './team-import-file-step/team-import-file-step';
import { TeamImportReviewStep } from './team-import-review-step/team-import-review-step';
import { TeamImportTemplateStep } from './team-import-template-step/team-import-template-step';

export interface TeamImportWizardData {
  existingTeamCount: number;
  maxTeamCapacity: number;
}

export interface TeamImportWizardOutcome {
  teams: TeamConfigCreateTeamPayload[];
  ignoredRows: number;
}

export type TeamImportWizardResult = TeamImportWizardOutcome | undefined;

type WizardStep = 1 | 2 | 3;

interface StepItem {
  number: WizardStep;
  label: string;
}

const TOTAL_STEPS = 3;
const TEMPLATE_ERROR = "Le modèle n'a pas pu être généré. Réessayez.";
const STEPS: StepItem[] = [
  { number: 1, label: 'Modèle' },
  { number: 2, label: 'Fichier' },
  { number: 3, label: 'Vérification' },
];

@Component({
  selector: 'app-team-import-wizard',
  imports: [ButtonIcon, Icon, TeamImportTemplateStep, TeamImportFileStep, TeamImportReviewStep],
  templateUrl: './team-import-wizard.html',
  styleUrl: './team-import-wizard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeamImportWizard {
  private readonly dialogRef = inject(DialogRef<TeamImportWizardResult>);
  public readonly data = inject<TeamImportWizardData>(DIALOG_DATA);

  private readonly limits = environment.tournamentConfiguration.teamImport;
  public readonly maxPlayersPerTeam = this.limits.maxPlayersPerTeam;
  public readonly maxTeamsPerImport = this.limits.maxTeamsPerImport;
  public readonly acceptedFormats = '.xlsx,.xlsm,.xls,.xlt,.ods,.csv';
  public readonly steps = STEPS;

  public readonly step = signal<WizardStep>(1);
  public readonly playersCount = signal(Math.min(2, this.maxPlayersPerTeam));
  public readonly fileName = signal<Nullable<string>>(null);
  public readonly fileError = signal<Nullable<TeamImportFileError>>(null);
  public readonly parsedRows = signal<ParsedTeamRow[]>([]);
  public readonly filter = signal<ImportRowFilter>('all');
  public readonly isParsing = signal(false);
  public readonly templateError = signal<Nullable<string>>(null);

  public readonly views = computed(() =>
    classifyImportRows(this.parsedRows(), this.data.existingTeamCount),
  );
  public readonly counts = computed(() => countImportRows(this.views()));
  public readonly capacity = computed(() =>
    computeImportCapacity(
      this.data.existingTeamCount,
      this.counts().importable,
      this.data.maxTeamCapacity,
    ),
  );
  public readonly blockReason = computed(() =>
    buildImportBlockReason(this.counts(), this.capacity()),
  );
  public readonly canImport = computed(() => this.blockReason() === null);
  public readonly canGoBack = computed(() => this.step() > 1);
  public readonly progressLabel = computed(() => `Étape ${this.step()} sur ${TOTAL_STEPS}`);
  public readonly visibleRows = computed(() => filterImportRows(this.views(), this.filter()));

  // Guards against a slow parse resolving after the user picked another file.
  private parseToken = 0;

  public onPlayersCountChange(value: number): void {
    this.playersCount.set(value);
  }

  public async onDownloadTemplate(): Promise<void> {
    this.templateError.set(null);
    try {
      const blob = await generateTeamsExcelTemplate(this.playersCount());
      downloadBlob(blob, `${this.limits.fileName}.xlsx`);
    } catch {
      this.templateError.set(TEMPLATE_ERROR);
    }
  }

  public onContinue(): void {
    this.step.set(2);
  }

  public async onFileSelected(file: File): Promise<void> {
    const token = ++this.parseToken;
    this.isParsing.set(true);
    this.fileName.set(file.name);
    this.fileError.set(null);

    let error: Nullable<TeamImportFileError> = null;
    let rows: ParsedTeamRow[] = [];
    try {
      const result = await parseTeamsExcelFile(file, this.limits);
      if (result.globalError) {
        error = {
          fileName: file.name,
          message: result.globalError,
          foundHeaders: result.foundHeaders,
          expectedHeaders: result.foundHeaders
            ? getTemplateHeaders(this.playersCount())
            : undefined,
        };
      } else if (result.rows.length === 0) {
        error = { fileName: file.name, message: 'Aucune équipe trouvée dans le fichier.' };
      } else {
        rows = result.rows;
      }
    } catch {
      error = { fileName: file.name, message: "Ce fichier n'a pas pu être lu." };
    }

    if (token !== this.parseToken) {
      return;
    }
    this.isParsing.set(false);
    this.fileError.set(error);
    if (!error) {
      this.parsedRows.set(rows);
      this.filter.set('all');
      this.step.set(3);
    }
  }

  public onFilterChange(filter: ImportRowFilter): void {
    this.filter.set(filter);
  }

  public onChangeFile(): void {
    this.fileError.set(null);
    this.step.set(2);
  }

  /** Header back arrow: step 3 behaves like « Changer de fichier », step 2 returns to the template. */
  public onBack(): void {
    if (this.step() === 3) {
      this.onChangeFile();
    } else if (this.step() === 2) {
      this.step.set(1);
    }
  }

  public onCancel(): void {
    this.dialogRef.close(undefined);
  }

  public onImport(): void {
    if (!this.canImport()) {
      return;
    }
    this.dialogRef.close({
      teams: toImportPayload(this.parsedRows()),
      ignoredRows: this.counts().ignored,
    });
  }
}
