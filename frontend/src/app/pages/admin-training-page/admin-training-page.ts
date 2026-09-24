import { Dialog } from '@angular/cdk/dialog';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import {
  ConfirmationData,
  ConfirmationPopupComponent,
} from 'src/app/modales/confirmation-popup/confirmation-popup';
import { disconnectTrainingAdministrator } from 'src/app/store/training/training.actions';
import {
  addTrainingMember,
  connectTrainingAdministrator,
  removeTrainingMember,
} from 'src/app/store/training/training.admin.actions';
import { loadTrainingSessions } from 'src/app/store/training/training.session.actions';
import {
  selectAddTrainingMemberLoading,
  selectCurrentTrainingAdminInformations,
  selectCurrentTrainingData,
  selectCurrentTrainingIsLoading,
  selectTrainingSessions,
  selectTrainingSessionsIsLoading,
} from 'src/app/store/training/training.selectors';
import { TrainingMemberDto } from 'src/app/store/training/training.models';
import { TrainingHeader } from './components/training-header/training-header';
import { TrainingRosterCard } from './components/training-roster-card/training-roster-card';
import { TrainingSessionList } from './components/training-session-list/training-session-list';

@Component({
  selector: 'app-admin-training-page',
  imports: [TrainingHeader, TrainingSessionList, TrainingRosterCard],
  templateUrl: './admin-training-page.html',
  styleUrl: './admin-training-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminTrainingPage implements OnInit {
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly store = inject(Store);
  private readonly dialog = inject(Dialog);

  public readonly trainingCode = signal<string | null>(null);

  // Champ simple et non réactif : une garde qui vivrait dans un signal relancerait l'effect.
  private sessionsRequestedFor: string | null = null;

  // Selects
  public readonly training = this.store.selectSignal(selectCurrentTrainingData);
  public readonly sessions = this.store.selectSignal(selectTrainingSessions);
  public readonly sessionsLoading = this.store.selectSignal(selectTrainingSessionsIsLoading);
  public readonly addMemberLoading = this.store.selectSignal(selectAddTrainingMemberLoading);
  private readonly adminSession = this.store.selectSignal(selectCurrentTrainingAdminInformations);
  private readonly trainingIsLoading = this.store.selectSignal(selectCurrentTrainingIsLoading);

  // Compute
  public readonly trainingLoading = computed(() => !this.training() && this.trainingIsLoading());
  private readonly adminPassword = computed(() => this.adminSession()?.password ?? null);
  // Les séances arrivent de la plus ancienne à la plus récente : la dernière ligne est la plus récente.
  public readonly lastSessionDate = computed(() => this.sessions().at(-1)?.date ?? null);

  constructor() {
    // Connexion dès que le code de l'URL et le mot de passe en mémoire sont tous les deux connus.
    effect(() => {
      const code = this.trainingCode();
      const password = this.adminPassword();
      const currentTrainingCode = this.training()?.code;

      if (!code || !password || currentTrainingCode === code) {
        return;
      }

      this.store.dispatch(connectTrainingAdministrator({ code, password }));
    });

    // Sans données ni chargement en cours, c'est que la session admin est perdue.
    effect(() => {
      if (!this.training() && !this.trainingLoading()) {
        this.reconnectAsAdmin();
      }
    });

    // Les séances ne viennent pas avec le groupe : il faut un appel dédié une fois connecté.
    // La garde évite de relancer l'appel à chaque fois que le groupe est remplacé en mémoire,
    // ce qui arrive après chaque ajout ou retrait de membre.
    effect(() => {
      const code = this.training()?.code;
      if (!code || this.sessionsRequestedFor === code) {
        return;
      }

      this.sessionsRequestedFor = code;
      this.store.dispatch(loadTrainingSessions({ trainingCode: code }));
    });
  }

  ngOnInit(): void {
    this.activatedRoute.paramMap.subscribe((params) => {
      const code = params.get('trainingCode');
      if (code) {
        this.trainingCode.set(code);
      } else {
        this.reconnectAsAdmin();
      }
    });
  }

  // ========= Actions =========

  public disconnect(): void {
    this.store.dispatch(disconnectTrainingAdministrator());
    this.router.navigate(['/accueil']);
  }

  private reconnectAsAdmin(): void {
    this.store.dispatch(disconnectTrainingAdministrator());
    this.router.navigate(['/admin/training']);
  }

  public openSession(sessionCode: string): void {
    const trainingCode = this.training()?.code;
    if (!trainingCode) {
      return;
    }
    this.router.navigate([`/admin/training/${trainingCode}/session/${sessionCode}`]);
  }

  public createSession(): void {
    const trainingCode = this.training()?.code;
    if (!trainingCode) {
      return;
    }
    this.router.navigate([`/admin/training/${trainingCode}/session-creation`]);
  }

  public addMember(name: string): void {
    const code = this.training()?.code;
    if (!code) {
      return;
    }
    this.store.dispatch(addTrainingMember({ code, name }));
  }

  public removeMember(member: TrainingMemberDto): void {
    const code = this.training()?.code;
    if (!code) {
      return;
    }

    const data: ConfirmationData = {
      title: 'Retirer le membre',
      message: `${member.name} sera retiré(e) du roster du club. Les séances déjà jouées ne sont pas modifiées.`,
      confirmLabel: 'Retirer',
    };

    this.dialog
      .open<boolean, ConfirmationData>(ConfirmationPopupComponent, {
        data,
        panelClass: 'dialog-panel',
        backdropClass: 'dialog-backdrop-light',
        disableClose: false,
      })
      .closed.subscribe((confirmed) => {
        if (confirmed) {
          this.store.dispatch(removeTrainingMember({ code, memberId: member.id }));
        }
      });
  }
}
