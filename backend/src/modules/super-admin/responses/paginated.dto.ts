export interface PaginatedDto<T> {
    items: T[];
    total: number;
}
