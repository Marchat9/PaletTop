import { ObjectLiteral, SelectQueryBuilder } from 'typeorm';

export interface AdminSearchOptions {
    page: number;
    pageSize: number;
    search?: string;
    sortBy?: string;
    sortDir?: 'ASC' | 'DESC';
}

// Termine une requête de recherche admin déjà construite par l'appelant (jointures, sous-requête
// de comptage, filtres propres à l'entité) : prédicat de recherche insensible aux accents, tri,
// pagination. Partagé par TrainingRepository et TournamentRepository pour que ce bloc, identique
// entre les deux, ne diverge jamais silencieusement.
export async function paginateAdminSearch<T extends ObjectLiteral>(
    queryBuilder: SelectQueryBuilder<T>,
    options: AdminSearchOptions,
    searchClause: string | null,
    sortableColumns: Record<string, string>,
    defaultSortColumn: string,
): Promise<{ items: T[]; total: number }> {
    if (searchClause && options.search) {
        queryBuilder.andWhere(searchClause, { search: `%${options.search}%` });
    }

    const sortColumn = (options.sortBy && sortableColumns[options.sortBy]) || defaultSortColumn;
    const sortDir = options.sortDir === 'ASC' ? 'ASC' : 'DESC';

    const [items, total] = await queryBuilder
        .orderBy(sortColumn, sortDir)
        .skip((options.page - 1) * options.pageSize)
        .take(options.pageSize)
        .getManyAndCount();

    return { items, total };
}
