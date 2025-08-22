export type DBStructBase = {
    id: string | number;
    createdAt: Date;
    updatedAt?: Date;
    deleted?: boolean;
}