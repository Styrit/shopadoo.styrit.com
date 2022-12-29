export interface ISyncService
{
    lastSyncDate: Date

    getChanges(): any
}