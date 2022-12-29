import { autoinject, inject, LogManager } from 'aurelia-framework'
import { EventAggregator } from 'aurelia-event-aggregator'
import { Logger } from 'aurelia-logging'

import { ToDoList, IToDoList } from 'Models/ToDoList'
import { ToDoItem } from 'Models/ToDoItem'
import { ListService } from 'Services/ListService'
import { SettingsService } from 'Services/SettingsService'
import { AppService } from 'Services/AppService'

@autoinject
export class SyncService {
    private logger: Logger = LogManager.getLogger('SyncService')

    private _hasChanges: boolean
    public get hasChanges(): boolean {
        return this._hasChanges
    }
    public set hasChanges(v: boolean) {
        this._hasChanges = v
        if (v) {
            this.scheduleUpSync(false)
        }
    }

    private upSyncTimer: number
    private downSyncTimer: number
    private lastDownSync: Date

    constructor(
        private listService: ListService,
        private settingsService: SettingsService,
        private eventAggregator: EventAggregator,
        private appService: AppService
    ) {
        eventAggregator.subscribe('ToDoListChanged', (e: ToDoList) => {
            if (this.settingsService.settings.syncData || e.shared) {
                console.log('ToDoListChanged: ' + e.name)
                this.hasChanges = true

                if (!this.settingsService.storageProvider.authService.loggedIn)
                    this.appService.trySilentLogin()
            }
        })

        eventAggregator.subscribe('ToDoItemChanged', (e: ToDoItem) => {
            if (this.settingsService.settings.syncData || (e.toDoList && e.toDoList.shared)) {
                console.log('ToDoItemChanged: ' + e.name)
                this.hasChanges = true

                if (!this.settingsService.storageProvider.authService.loggedIn) {
                    this.appService.trySilentLogin()
                }
            }
        })

        this.appService.onVisibilityChanged.on(visible => {
            if (visible) {
                this.scheduleDownSync()

                // do up sync for undone up-sync items
                this.scheduleUpSync()
            }
            else {
                clearInterval(this.downSyncTimer)
            }
        })

    }

    /** Do full sync */
    sync(): Promise<void> {
        if (!this.settingsService.storageProvider.syncSupport) {
            return Promise.reject('No Sync Support for the StorageProvider')
        }

        return new Promise<void>((resolve, reject) => {
            this.settingsService.storageProvider.authService.login()
                .then(loggedIn => {
                    if (!loggedIn) {
                        reject('Login canceled/failed.')
                    }
                    else {
                        console.log('start down sync')
                        this.lastDownSync = new Date()

                        this.downSyncCloudChanges(this.listService.myLists, false)
                            .then((downSyncLists) => {
                                this.logger.info('down sync done', downSyncLists)

                                let localChanges = this.getLocalChanges(this.listService.myLists, true)

                                // exclude recent downloaded lists here
                                let changesToUpload = localChanges.filter(localList => downSyncLists.find(downSyncList => downSyncList.id == localList.id) == undefined)

                                this.logger.info('starting up sync', changesToUpload)

                                this.upSyncLocalChanges(changesToUpload)
                                    .then(() => {
                                        resolve()
                                    })
                                    .catch(error => {
                                        this.logger.warn('One or more up sync file operations failed: ', error)
                                        reject(error)
                                    })
                            })
                            .catch(error => {
                                this.logger.error('downSyncCloudChanges error: ', error)
                                reject(error)
                            })
                    }
                })
                .catch(error => {
                    this.logger.error('Error on login: ', error)
                    reject(error)
                })
        })
    }

    scheduleDownSync() {
        console.log('schedule down sync')

        // execute the action immediately if the last execution is behind the polling time
        let actualDate = new Date()
        if (this.lastDownSync == undefined || this.lastDownSync.getTime()
            < actualDate.setTime(actualDate.getTime() - (this.settingsService.downSyncPollingSeconds * 1000))) {
            this.downSync()
        }

        clearInterval(this.downSyncTimer)
        this.downSyncTimer = window.setInterval(() => this.downSync(), this.settingsService.downSyncPollingSeconds * 1000)
    }

    downSync() {
        if (!this.settingsService.storageProvider.syncSupport) {
            console.log('Synchronization not supported by Storage Provider.')
            return
        }

        if (this.settingsService.settings && this.settingsService.settings.syncData) {
            console.log('try to login')
            this.settingsService.storageProvider.authService.login()
                .then(loggedIn => {
                    if (!loggedIn) {
                        console.log('Warning: not logged in, down sync skipped')
                        this.appService.showNotLoggedInWarning()
                    }
                    else {
                        console.log('start down sync')
                        this.lastDownSync = new Date()

                        this.downSyncCloudChanges(this.listService.myLists)
                            .then((changedLists) => {
                                console.log('downSync done')
                            })
                            .catch(error => {
                                if (error.code == 'resyncRequired') {
                                    // do re-sync immediately
                                    this.logger.info('re-sync start')
                                    return this.downSyncCloudChanges(this.listService.myLists)
                                        .then(() => {
                                            this.logger.info('re-sync done')
                                        })
                                }
                                else {
                                    return error
                                }
                            })
                    }
                })
                .catch(error => {
                    this.logger.error('Error at downSyncWorkItem: ', error)
                    this.appService.showDialog(
                        this.appService.getDialogModelFromError(error))
                })
        }
        else {
            console.log('downSync is disabled')
        }

        if (this.listService.myLists) {
            // down-sync shared lists, no authentication is necessary
            this.downSyncAllSharedChanges(this.listService.myLists)
                .then(() => {
                    console.log('downSync shared items complete')
                })
                .catch(error => {
                    this.logger.error('downSyncAllSharedChanges error: ', error)
                    this.appService.showDialog(
                        this.appService.getDialogModelFromError(error))
                })
        }
    }

    /**     
     * @param silentLogin default = true
     */
    scheduleUpSync(silentLogin = true) {
        console.log('up sync scheduled')

        // clear up sync timer
        if (this.upSyncTimer != undefined)
            clearTimeout(this.upSyncTimer)

        this.upSyncTimer = window.setTimeout(() => {
            this.upSync(silentLogin)
                .catch(error => {
                    this.logger.warn('One or more up sync file operations failed: ', error)
                    this.appService.showDialog(
                        this.appService.getDialogModelFromError(error))
                })
        },
            this.settingsService.upSyncChangesAfterSeconds * 1000)
    }

    /**     
     * @param silentLogin default = true
     */
    upSync(silentLogin = true): Promise<void> {
        if (!this.settingsService.storageProvider.syncSupport) {
            this.logger.info('Synchronization not supported by Storage Provider.')
            return Promise.resolve()
        }

        // clear up sync timer
        if (this.upSyncTimer != undefined)
            clearTimeout(this.upSyncTimer)

        this.logger.info('up sync started')

        let localChanges = this.getLocalChanges(this.listService.myLists)

        // upload only shared items if synchronization is disabled
        if (!this.settingsService.settings.syncData) {
            localChanges = localChanges.filter(item => item.shared)
        }

        // do not login if no changes have to sync
        if (localChanges.length == 0)
            return Promise.resolve()

        return new Promise<void>((resolve, reject) => {
            this.logger.info('up sync started')

            this.settingsService.storageProvider.authService.login(silentLogin)
                .then(loggedIn => {
                    if (!loggedIn) {
                        this.logger.warn('Warning: not logged in, up sync skipped')

                        if (silentLogin) {
                            this.appService.showNotLoggedInWarning()
                            resolve()
                        }
                        else {
                            reject('Not logged in, up sync skipped')
                        }
                    }
                    else {
                        this.upSyncLocalChanges(localChanges)
                            .then(() => {
                                resolve()
                            })
                            .catch(error => {
                                this.logger.warn('One or more up sync file operations failed: ', error)
                                this.appService.showDialog(this.appService.getDialogModelFromError(error))
                                reject(error)
                            })
                    }
                })
                .catch(error => {
                    this.logger.error('login error: ', error)
                    reject(error)
                })
        })
    }

    private downSyncAllSharedChanges(myLists: Array<ToDoList>): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            let downloadPromises = new Array<Promise<void>>()
            myLists.forEach(d => {
                if (d.shared) {
                    downloadPromises.push(this.downSyncSharedChanges(d))
                }
            })

            Promise.all(downloadPromises)
                .then(d => {
                    resolve()
                })
                .catch(error => {
                    this.logger.warn('downSyncAllSharedChanges error: ', error)
                    reject(error)
                })
        })
    }

    private downSyncSharedChanges(list: ToDoList): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            this.settingsService.storageProvider.driveService.downloadSharedFile(list.shared.url, 'json')
                .then((newList: IToDoList) => {
                    if (list.getLatestModifiedDateWithItems() < ToDoList.getLatestModifiedDateWithItems(newList))
                        list.update(newList)
                    resolve()
                })
                .catch(error => {
                    if (error.status == 404) {
                        console.log(`Shared list is not available anymore (404). List '${list.name}' will be unshared.`)
                        list.shared = undefined
                        this.appService.showDialog(
                            {
                                title: 'Can\'t access shared list',
                                text: `The shared list '${list.name}' is not available anymore. Contact the owner of this list and ask for a new shared link.`
                            }
                        )
                        resolve()
                    }
                    else {
                        this.logger.warn('Error at downSyncSharedChanges: ', error)
                        reject(error)
                    }
                })
        })
    }

    private downSyncCloudChanges(myLists: Array<ToDoList>, allowDeletion = true): Promise<IToDoList[]> {
        return new Promise<IToDoList[]>((resolve, reject) => {
            let fileContentPromises = new Array<Promise<Object>>()
            this.settingsService.storageProvider.driveService.getChanges()
                .then(delta => {
                    delta.forEach(driveItem => {
                        if (driveItem.file && driveItem.name.endsWith(ToDoList.fileExtension)) {
                            if (driveItem.deleted) {
                                let listToDelete = myLists.find(i => i.id == driveItem.name.substring(0, driveItem.name.length - ToDoList.fileExtension.length))
                                if (listToDelete && allowDeletion) {
                                    myLists.delete(listToDelete)
                                    this.logger.info(`List '${listToDelete.name}' deleted.`)
                                }
                                else if (listToDelete) {
                                    this.logger.info(`List '${listToDelete.name}' deletion skipped.`)
                                }
                            }
                            else {
                                fileContentPromises.push(this.settingsService.storageProvider.driveService.downloadFile(driveItem.name, 'json'))
                            }
                        }
                    })

                    Promise.all(fileContentPromises)
                        .then((fileContents: IToDoList[]) => {
                            let changedLists = new Array<IToDoList>()
                            for (let list of fileContents) {
                                let existingList = myLists.find(d => d.id == list.id)
                                if (existingList) {
                                    if (existingList.getLatestModifiedDateWithItems() < ToDoList.getLatestModifiedDateWithItems(list)) {
                                        existingList.update(list)
                                        this.logger.info('List updated: ' + existingList.name)
                                        changedLists.push(list as IToDoList)
                                    }
                                    else {
                                        this.logger.info('List update skipped (local version is newer). List name: ' + existingList.name)
                                    }
                                }
                                else {
                                    let newList = ToDoList.map(list as IToDoList)
                                    myLists.push(newList)
                                    this.logger.info('List added: ' + newList.name)
                                    changedLists.push(list as IToDoList)
                                }
                            }
                            resolve(changedLists)
                        })
                        .catch(error => {
                            this.logger.warn('Error on get file content: ', error)
                            reject(error)
                        })
                })
                .catch(error => {
                    this.logger.warn('Error on getChanges(): ', error)
                    reject(error)
                })
        })
    }

    private upSyncLocalChanges(changedLists: ToDoList[]): Promise<void> {
        this.hasChanges = false
        let fileOperationPromises = new Array<Promise<void>>()

        changedLists.forEach(list => {
            if (list.shared) {
                fileOperationPromises.push(this.settingsService.storageProvider.driveService.uploadSharedFile(list.shared.url, JSON.stringify(list.toPlainObject()))
                    .then(() => {
                        list.hasUserChanges = false
                    }))
            }
            else if (this.settingsService.settings.syncData) {
                fileOperationPromises.push(this.settingsService.storageProvider.driveService.uploadFile(list.fileName, list.toPlainObject())
                    .then(() => {
                        list.hasUserChanges = false
                    }))
            }
        })

        return Promise.all(fileOperationPromises)
            .then(() => {
                console.log('up sync done')
                this.settingsService.settings.lastUpSyncDate = new Date()
            })
    }

    private getLocalChanges(myLists: Array<ToDoList>, byLastUpSyncDate = false): Array<ToDoList> {
        let listChanges = new Array<ToDoList>()
        myLists.forEach(list => {
            if (byLastUpSyncDate) {
                let hasChanges = true
                if (this.settingsService.settings.lastUpSyncDate) {
                    // workaround, this...lastUpSyncDate is not accessible in .find()  
                    let lastUpSyncDateTemp = this.settingsService.settings.lastUpSyncDate
                    hasChanges = list.hasUserChanges
                        || (list.modified > this.settingsService.settings.lastUpSyncDate
                            || list.getItems().find(d => d.modified > lastUpSyncDateTemp) !== undefined)
                }
                if (hasChanges)
                    listChanges.push(list)
            }
            else if (list.hasUserChanges)
                listChanges.push(list)
        })

        this.logger.info('local changes:', listChanges)
        return listChanges
    }
}