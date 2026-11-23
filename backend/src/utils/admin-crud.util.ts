import { NotFoundException } from '@nestjs/common';
import { ObjectLiteral, Repository } from 'typeorm';

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
    // Already hashed by AdminPasswordService: never pass a clear password here.
    newPasswordHash: string,
    notFoundMessage: string,
): Promise<void> {
    const result = await repo.update(id, { adminPassword: newPasswordHash } as never);
    if (!result.affected) {
        throw new NotFoundException(notFoundMessage);
    }
}
