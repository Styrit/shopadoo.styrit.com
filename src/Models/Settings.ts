export interface ISettings {
    syncData: boolean
    lastUpSyncDate: string
    autoBackup: boolean
    lastAutoBackupDate: Date
    oneDriveDeltaToken: string
    googleDriveDeltaToken: string
    oneDriveRefreshToken: string
    storageProvider: string
}

export class Settings {
    syncData: boolean
    lastUpSyncDate = new Date()
    autoBackup = true
    lastAutoBackupDate = new Date()
    oneDriveDeltaToken: string
    googleDriveDeltaToken: string
    storageProvider: string

    //// only for windows authentication
    oneDriveRefreshToken: string

    static Map(settings: ISettings): Settings {
        let s = new Settings()
        if (settings) {
            s.syncData = settings.syncData
            if (settings.lastUpSyncDate)
                s.lastUpSyncDate = new Date(settings.lastUpSyncDate)
            if (settings.autoBackup != null)
                s.autoBackup = settings.autoBackup
            if (settings.lastAutoBackupDate)
                s.lastAutoBackupDate = new Date(settings.lastAutoBackupDate)
            s.oneDriveDeltaToken = settings.oneDriveDeltaToken
            s.oneDriveRefreshToken = settings.oneDriveRefreshToken
            s.googleDriveDeltaToken = settings.googleDriveDeltaToken
            s.storageProvider = settings.storageProvider
        }
        return s
    }
}