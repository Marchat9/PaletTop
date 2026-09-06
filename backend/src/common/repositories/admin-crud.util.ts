import { NotFoundException } from '@nestjs/common';
import { ObjectLiteral, Repository } from 'typeorm';

// Suppression par lot et réinitialisation de mot de passe admin : logique identique entre
// TrainingRepository et TournamentRepository, extraite ici pour qu'un correctif ne se fasse
// jamais à un seul des deux endroits par erreur.

export async function deleteManyByIds<T extends ObjectLiteral>(
    repo: Repository<T>,
    ids: string[],
): Promise<void> {
    if (!ids.length) return;
    await repo.delete(ids);
}

export async function updateAdminPasswordById<T extends ObjectLiteral>(
    repo: Repository<T>,
    id: string,
    newPassword: string,
    notFoundMessage: string,
): Promise<void> {
    const result = await repo.update(id, { adminPassword: newPassword } as never);
    if (!result.affected) {
        throw new NotFoundException(notFoundMessage);
    }
}
