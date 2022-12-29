import { autoinject, inject, BindingEngine, Disposable, LogManager } from 'aurelia-framework'
import { EventAggregator } from 'aurelia-event-aggregator'
import { Logger } from 'aurelia-logging'
import { get, set } from 'idb-keyval';

import * as system from 'System/index'
import { AppService } from 'Services/AppService'
import { ListService } from 'Services/ListService'
import { SettingsService } from 'Services/SettingsService'
import { HistoryService } from 'Services/HistoryService'
import { ToDoList, IToDoList } from 'Models/ToDoList'
import { Settings, ISettings } from 'Models/Settings'
import { ToDoItem } from 'Models/ToDoItem'

@autoinject
export class StorageService {
    private logger: Logger = LogManager.getLogger('StorageService')

    readonly storageKeyLists = 'myLists'
    readonly storageKeySettings = 'appSettings'
    readonly storageKeyHistory = 'itemHistory'

    readonly useIndexedDb = true

    private onListsLoadedEvent = new system.LiteEvent<void>()
    public get onListsLoaded(): system.ILiteEvent<void> { return this.onListsLoadedEvent }

    private onSettingsLoadedEvent = new system.LiteEvent<void>()
    public get onSettingsLoaded(): system.ILiteEvent<void> { return this.onSettingsLoadedEvent }

    private onDataLoadedEvent = new system.LiteEvent<void>()
    public get onDataLoaded(): system.ILiteEvent<void> { return this.onDataLoadedEvent }

    hashTable = new Map<string, string>()

    //// dataLoaded
    private _dataLoaded: boolean
    public get dataLoaded(): boolean {
        return this._dataLoaded
    }
    public set dataLoaded(v: boolean) {
        this._dataLoaded = v
        if (v) {
            this.logger.info('StorageService: Data loaded')
            this.onDataLoadedEvent.trigger()
        }
    }

    //// listsLoaded
    private _listsLoaded: boolean
    public get listsLoaded(): boolean {
        return this._listsLoaded
    }
    public set listsLoaded(v: boolean) {
        this._listsLoaded = v
        if (v) {
            this.onListsLoadedEvent.trigger()
            this.dataLoaded = this.settingsLoaded
        }
    }

    //// settingsLoaded
    private _settingsLoaded: boolean
    public get settingsLoaded(): boolean {
        return this._settingsLoaded
    }
    public set settingsLoaded(v: boolean) {
        this._settingsLoaded = v
        if (v) {
            this.onSettingsLoadedEvent.trigger()
            this.dataLoaded = this.listsLoaded
        }
    }

    historyLoaded: boolean

    private saveTimer: number

    constructor(
        private appService: AppService,
        private settingsService: SettingsService,
        private listService: ListService,
        private historyService: HistoryService,
        eventAggregator: EventAggregator
    ) {
        appService.onVisibilityChanged.on(async visible => {
            if (!visible) {
                await Promise.all([
                    this.saveLists(),
                    this.saveSettings(),
                    this.saveHistory()])
                this.logger.info("App data persisted.")
            }
        })

        eventAggregator.subscribe('ToDoListChanged', (e: ToDoList) => {
            console.log('ToDoListChanged: ' + e.name)
            this.scheduleSave()
        })

        eventAggregator.subscribe('ToDoItemChanged', (e: ToDoItem) => {
            console.log('ToDoItemChanged: ' + e.name)
            this.scheduleSave()
        })
    }

    scheduleSave() {
        console.log('data save scheduled')

        // clear up sync timer
        if (this.saveTimer != undefined)
            clearTimeout(this.saveTimer)

        this.saveTimer = window.setTimeout(async () => {
            await this.saveLists()
            this.logger.info("App lists persisted from scheduler.")
        },
            3 * 1000)
    }

    executeOnDataLoaded(task: Function) {
        if (this.dataLoaded)
            task()
        else {
            this.onDataLoaded.on(task)
        }
    }

    executeOnListsLoaded(task: Function) {
        if (this.listsLoaded)
            task()
        else {
            this.onListsLoaded.on(task)
        }
    }

    async loadLists() {
        let data: IToDoList[]
        try {
            data = await this.loadFromStorage<IToDoList[]>(this.storageKeyLists)
        } catch (error) {
            this.logger.error('Error loading lists: ', error)
        }
        if (data == null)
            data = this.listService.getDefaultData()

        this.listService.setLists(data)
        this.listsLoaded = true
    }

    async saveLists() {
        // Store and Retrieve Array in Application Data
        // http://stackoverflow.com/questions/26248020/store-and-retrieve-winjs-binding-list-in-application-data

        // do not save the data if app start fails
        if (this.listService.myLists) {
            try {
                await this.saveToStorage(this.storageKeyLists, this.listService.myListsToPlainObject())
            } catch (error) {
                this.logger.error('Error saving lists: ', error)
            }
        }
    }

    async loadSettings() {
        try {
            const data = await this.loadFromStorage<ISettings>(this.storageKeySettings)
            this.settingsService.settings = Settings.Map(data)
        } catch (error) {
            this.logger.error('Error loading settings: ', error)
        }
        this.settingsLoaded = true
    }

    async saveSettings() {
        if (this.settingsService.settings) {
            try {
                await this.saveToStorage(this.storageKeySettings, this.settingsService.settings)
            } catch (error) {
                this.logger.error('Error saving settings: ', error)
            }
        }
    }

    async loadHistory() {
        try {
            const data = await this.loadFromStorage<string[]>(this.storageKeyHistory)
            if (data)
                this.historyService.itemHistory = data
        } catch (error) {
            this.logger.error('Error loading history: ', error)
        }
        this.historyLoaded = true
    }

    saveHistory() {
        if (this.historyService.itemHistory && this.historyService.itemHistory.length) {
            try {
                return this.saveToStorage(this.storageKeyHistory, this.historyService.itemHistory.slice(0, 100))
            } catch (error) {
                this.logger.error('Error saving history: ', error)
            }
        }
    }

    private async saveToStorage(key: string, value: Object) {
        let stringValue = JSON.stringify(value)
        let stringValueHash = stringValue.hashCode()

        let oldHash = this.hashTable.get(key)
        if (oldHash && oldHash == stringValueHash) {
            this.logger.info(`Saving skipped. No changes found for key '${key}'`)
            return
        }

        if (this.useIndexedDb) {
            await set(key, stringValue)
        } else {
            localStorage.setItem(key, stringValue)
        }

        this.logger.info(`Saved data to storage (Web) key '${key}': '${stringValue.truncate(100)}'`)
        this.hashTable.set(key, stringValueHash)
        return
    }

    private async loadFromStorage<T>(key: string) {
        let data: string
        if (this.useIndexedDb) {
            data = await get(key)
        }
        if (!data) {
            data = localStorage.getItem(key)
        }

        if (data)
            this.hashTable.set(key, data.hashCode())

        this.logger.info(`Loaded data from LocalStorage (Web) with key '${key}': '${data && data.truncate(100)}'`)
        return JSON.parse(data) as T
    }
}