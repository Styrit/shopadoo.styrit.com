import { autoinject } from 'aurelia-framework'
import { DialogService, DialogCancellableOpenResult } from 'aurelia-dialog'
import { getLogger } from 'aurelia-logging'
import { EventAggregator } from 'aurelia-event-aggregator'

import * as system from 'System/index'
import { SettingsService } from "./SettingsService"
import { AppService } from './AppService'
import { ListService } from './ListService'
import { StorageService } from './StorageService'

@autoinject
export class BackupService {
    private logger = getLogger('BackupService')

    error: unknown

    constructor(private listService: ListService,
        private settingsService: SettingsService,
        private storageService: StorageService,
        private appService: AppService
    ) {
        this.appService.onVisibilityChanged.on(async visible => {
            if (!settingsService.settings.autoBackup)
                return
            if (!visible || this.error) {
                if (this.settingsService.settings.lastAutoBackupDate.addDays(4) <= new Date()) {
                    // do backup
                    let loggedIn = false
                    try {
                        loggedIn = await this.settingsService.storageProvider.authService.login(false)
                    }
                    catch (error) {
                        this.logger.info('Error on login.')
                    }
                    if (loggedIn) {
                        try {
                            await this.createBackup()
                            this.settingsService.settings.lastAutoBackupDate = new Date()
                            // save settings
                            this.storageService.saveSettings()
                            this.error = undefined
                        }
                        catch (error) {
                            this.logger.error('Error on auto backup.', error)
                            this.error = error
                            this.appService.showDialog(this.appService.getDialogModelFromError(error))
                        }
                    }
                    else {
                        this.error = 'Login error.'
                        this.appService.showDialog({
                            title: 'Login needed.',
                            text: 'To prevent data loss, auto-backup in settings is enabled by default.'
                        })
                    }
                }
                else {
                    this.logger.debug(`Auto-Backup skipped. Last backup was done at ${this.settingsService.settings.lastAutoBackupDate.toLocaleString()}.`)
                }
            }
        })
    }

    async createBackup() {
        const dateString = new Date().toISOString().split("T")[0]
        const backupFileName = 'lists_' + dateString + '.backup'
        const fileInfo = await this.settingsService.storageProvider.driveService.uploadFile(backupFileName, this.listService.myListsToPlainObject())
        this.logger.info(`Auto backup created (${backupFileName}).`)
    }
}