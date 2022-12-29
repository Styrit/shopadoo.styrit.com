import { autoinject, LogManager } from 'aurelia-framework'
import { Router } from 'aurelia-router'
import { Logger } from 'aurelia-logging'

import { AppService } from 'Services/AppService'
import { ListService } from 'Services/ListService'
import { SyncService } from 'Services/SyncService'
import { StorageService } from 'Services/StorageService'
import { SettingsService } from 'Services/SettingsService'
import { ToDoList, IToDoList } from 'Models/ToDoList'
import { Settings, ISettings } from 'Models/Settings'
import { HistoryService } from 'Services/HistoryService'

@autoinject
export class WebEventService {
    private logger: Logger = LogManager.getLogger('WebEventService')
    private hasExternStorageChange: boolean

    constructor(
        private appService: AppService,
        private settingsService: SettingsService,
        private listService: ListService,
        private syncService: SyncService,
        private historyService: HistoryService,
        private storageService: StorageService,
        private router: Router
    ) { }

    init() {
        this.initEvents()
        //this.webMessageService.init(System.Info.clientId)
        //this.webMessageService.send(webAppStartMessageKey)

        // this.webMessageService.onMessageReceived.on(data => {
        //     if (data.message != webAppStartMessageKey) {
        //         this.hasExternStorageChange = true

        //         this.appService.showWarning({ title: 'Continue here', text: 'You were using shopadoo in another window.' })
        //             .then(result => {
        //                 //window.location.reload(true)
        //                 window.location.assign('/')

        //             })
        //             .catch(error => {
        //                 this.logger.debug('Error on show warning.', error)

        //             })
        //     }

        // })
    }

    private initEvents() {
        window.addEventListener('beforeunload', event => {
            //// do not save any data if changed on other tabs
            //// what to do if there are changes in multiple tabs?
            //// save changes on tab leave?
            if (this.hasExternStorageChange) {
                this.logger.info('Saving changes skipped, data was saved by other tab.')
                return
            }

            try {
                this.storageService.saveLists()

            } catch (error) {
                this.logger.error('Error on saving lists', error)

            }

            try {
                this.storageService.saveSettings()

            } catch (error) {
                this.logger.error('Error on saving settings', error)

            }

            try {
                this.storageService.saveHistory()

            } catch (error) {
                this.logger.error('Error on saving history', error)

            }

            if (this.listService.myLists && this.syncService.hasChanges) {
                this.upSyncChanges()
                event.returnValue = 'You are uploading changes! CHILL OUT!'
                return 'You are uploading changes! CHILL OUT!'
            }
        })

        this.appService.onVisibilityChanged.on(visible => {
            if (this.listService.myLists && this.syncService.hasChanges && !visible) {
                this.syncService.upSync()
            }
        })

        window.addEventListener('storage', event => {
            this.logger.info('Storage changed', event)

            switch (event.key) {
                case this.storageService.storageKeyLists:
                    let listData = JSON.parse(event.newValue) as IToDoList[]
                    this.listService.setLists(listData)
                    break

                case this.storageService.storageKeySettings:
                    let settingsData = JSON.parse(event.newValue) as ISettings
                    this.settingsService.settings = Settings.Map(settingsData)
                    break

                case this.storageService.storageKeyHistory:
                    let historyData = JSON.parse(event.newValue) as string[]
                    this.historyService.itemHistory = historyData
                    this.storageService.historyLoaded = true
                    break
            }

            if (event.newValue)
                this.storageService.hashTable.set(event.key, event.newValue.hashCode())

            this.router.navigate('MyLists')
        })
    }

    private upSyncChanges() {
        //// do up sync
        this.syncService.upSync(false)
            .then(() => {
                this.notify('Synchronization done!')
            })
            .catch(error => {
                this.logger.error('startUpSync error: ', error)
            })
    }

    notify(text: string) {
        //// https://developer.mozilla.org/en/docs/Web/API/notification

        if ('Notification' in window) {
            Notification.requestPermission()
                .then(result => {
                    if (result == 'granted') {
                        let notification = new Notification(text, { icon: '/favicons/favicon.png' })
                    }
                })
        }
    }
}
