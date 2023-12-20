import { autoinject, inject, BindingEngine, Disposable, LogManager } from 'aurelia-framework'
import { DialogService } from 'aurelia-dialog'
import { Logger } from 'aurelia-logging'

import * as system from 'System/index'
import { SettingsService } from 'Services/SettingsService'
import { ListService } from 'Services/ListService'
import { IAuthService, IStorageProvider } from 'Interfaces/IAuthService'
import { OneDriveService } from 'Services/OneDriveService'
import { SyncService } from 'Services/SyncService'
import { ImportService } from 'Services/ImportService'
import { ToDoList, IToDoList } from 'Models/ToDoList'
import { AppService } from 'Services/AppService'
import { ModalDialog, IModalDialogModel } from 'Components/modal-dialog'

@autoinject
export class SettingsViewModel {
    private logger: Logger = LogManager.getLogger('SettingsViewModel')

    private _isLoading: boolean;
    public get isLoading(): boolean {
        return this._isLoading;
    }
    public set isLoading(v: boolean) {
        this._isLoading = v;
    }

    private _enableSync: boolean
    public get enableSync(): boolean {
        return this._enableSync
    }
    public set enableSync(v: boolean) {
        this._enableSync = v
        this.settingsService.settings.syncData = v
        if (v) {
            this.syncService.sync()
                .catch(error => {
                    this.logger.error(error)
                })
        }
    }

    hasStyritShoppingListData: boolean
    isDevMode = system.Info.isDevMode
    storageProviderSubscription: Disposable
    isUnsupportedBrowser: boolean

    constructor(
        private settingsService: SettingsService,
        private listService: ListService,
        private syncService: SyncService,
        private importService: ImportService,
        private bindingEngine: BindingEngine,
        private dialogService: DialogService,
        private appService: AppService
    ) {
        this._enableSync = settingsService.settings.syncData
        this.settingsService.storageProvider.authService.onUserLoggedIn.on(this.onLoginHandler)
        if (system.Info.isInternetExplorerBrowser) {
            this.isUnsupportedBrowser = true
        }

        //// subscribe
        //// http://stackoverflow.com/questions/28419242/property-change-subscription-with-aurelia#comment50103007_28419242
        this.storageProviderSubscription = bindingEngine.propertyObserver(this.settingsService, 'storageProvider')
            .subscribe((newValue: IStorageProvider, oldValue: IStorageProvider) => {
                oldValue.authService.onUserLoggedIn.off(this.onLoginHandler)
                newValue.authService.onUserLoggedIn.on(this.onLoginHandler)

                if (!settingsService.storageProvider.syncSupport)
                    this.enableSync = false
            })
    }

    private attached() {
        //// TODO: is this the right place?

        if (this.settingsService.storageProvider.authService.loggedIn || (!this.settingsService.storageProvider.authService.loggedIn && this.settingsService.settings.syncData)) {
            // login again to get a fresh token for the next operations
            this.settingsService.storageProvider.authService.login()
                .then(loggedIn => {
                    this.logger.info('Authentication done')
                    this.settingsService.storageProvider.driveService.checkBackup()
                })
                .catch(error => {
                    // logout on error here?
                    this.appService.showDialog(this.appService.getDialogModelFromError(error))
                })
        }
    }

    private detached() {
        this.storageProviderSubscription.dispose()
        this.settingsService.storageProvider.authService.onUserLoggedIn.off(this.onLoginHandler)
    }

    login() {
        this.settingsService.storageProvider.authService.login(false)
            .then(loggedIn => {
                this.logger.info('Authenticated: ', loggedIn)
                if (loggedIn && this.settingsService.storageProvider.id == 'OneDrive') {
                    //// check 'Styrit Shopping List' backup
                    this.importService.hasStyritShoppingListData()
                        .then(hasData => {
                            this.hasStyritShoppingListData = hasData
                        })
                }
            })
            .catch(error => {
                this.appService.showDialog(this.appService.getDialogModelFromError(error))
            })
    }

    logout() {
        this.settingsService.storageProvider.authService.logout()
    }

    createBackup() {
        this.settingsService.storageProvider.authService.login(true)
            .then(loggedIn => {
                if (loggedIn) {
                    this.isLoading = true
                    this.settingsService.storageProvider.driveService.uploadFile(this.settingsService.backupFileName, this.listService.myListsToPlainObject())
                        .then(d => {
                            this.settingsService.storageProvider.driveService.hasBackup = true
                            this.settingsService.storageProvider.driveService.lastBackupDate = new Date()
                        })
                        .catch(error => {
                            this.appService.showDialog(this.appService.getDialogModelFromError(error))
                        })
                        .then(() => {
                            this.isLoading = false
                        })
                }
            })
            .catch(error => {
                this.isLoading = false
                this.appService.showDialog(this.appService.getDialogModelFromError(error))
            })
    }

    restoreBackup() {
        this.dialogService.open({
            viewModel: ModalDialog, model: <IModalDialogModel>{
                title: 'Override local data?',
                text: 'You will lose your local lists.',
                showCancelButton: true,
                yesNo: true
            }
        })
            .whenClosed(response => {
                if (!response.wasCancelled) {
                    this.settingsService.storageProvider.authService.login(true)
                        .then(loggedIn => {
                            if (loggedIn) {
                                this.isLoading = true

                                // todo: login!

                                this.settingsService.storageProvider.driveService.downloadFile(this.settingsService.backupFileName, 'json')
                                    .then(data => {
                                        //// To avoid up sync all restored items, set the lastUpSyncDate to now
                                        //// We can do that, because the data is up to date after an backup restore
                                        this.settingsService.settings.lastUpSyncDate = new Date()

                                        this.listService.setLists(data as IToDoList[])
                                    })
                                    .catch(error => {
                                        this.appService.showDialog(this.appService.getDialogModelFromError(error))
                                    })
                                    .then(() => {
                                        // start down sync immediately to get latest shared and synced files
                                        this.syncService.downSync()
                                        this.isLoading = false
                                    })
                            }
                        })
                        .catch(error => {
                            this.isLoading = false
                            this.appService.showDialog(this.appService.getDialogModelFromError(error))
                        })
                }
            })
    }

    test() {
        // this.appService.showDialog({ title: 'Test title!', text: 'Test text' })
        // ga('send', 'exception', { 'exDescription': 'Test Message!', 'exFatal': true })

        this.logger.error('TEst ERROR')



    }

    manualUpSync() {
        if (this.settingsService.storageProvider.authService.loggedIn) {
            this.syncService.upSync(false)
        }
    }

    manualDownSync() {
        if (this.settingsService.storageProvider.authService.loggedIn) {
            this.syncService.scheduleDownSync()
        }
    }

    importStyritShoppingListBackup() {
        this.dialogService.open({
            viewModel: ModalDialog, model: <IModalDialogModel>{
                title: 'Import data from \'Styrit Shopping List\' backup?',
                text: 'This will append your previous lists on your existing lists.',
                showCancelButton: true
            }
        })
            .whenClosed(response => {
                if (!response.wasCancelled) {
                    this.isLoading = true
                    if (this.settingsService.storageProvider.authService.loggedIn) {
                        this.importService.getStyritShoppingListData()
                            .then(lists => {
                                for (let list of lists) {
                                    this.listService.addOrUpdateList(list)
                                }
                                this.logger.info('importStyritShoppingListBackup completed')
                            })
                            .catch(error => {
                                this.logger.error('importStyritShoppingListBackup error: ', error)

                                this.dialogService.open({
                                    viewModel: ModalDialog, model: <IModalDialogModel>{
                                        title: 'Error on import',
                                        text: 'It seems there is a problem :('
                                    }
                                })
                            })
                            .then(() => {
                                this.isLoading = false
                            })
                    }
                }
            })
    }

    private onLoginHandler = () => {
        // check backup on login             
        this.settingsService.storageProvider.driveService.checkBackup()
    }
}