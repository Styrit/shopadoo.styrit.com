import { autoinject } from 'aurelia-framework'
import { Lazy, inject } from 'aurelia-framework'
import { Router, RouterConfiguration } from 'aurelia-router'
import { EventAggregator } from 'aurelia-event-aggregator'
import { getLogger } from 'aurelia-logging'
import { PLATFORM } from 'aurelia-pal'

import 'System/Extensions.Array'
import 'System/Extensions.Date'
import 'System/Extensions.Number'
import 'System/Extensions.String'
import * as system from 'System/index'
import { AppService } from 'Services/AppService'
import { ListService } from 'Services/ListService'
import { StorageService } from 'Services/StorageService'
import { ToDoList } from 'Models/ToDoList'
import { WebEventService } from 'LocalWebCode/WebEventService'
import { SyncService } from 'Services/SyncService'
import { IAuthService } from 'Interfaces/IAuthService'
import { BackupService } from 'Services/BackupService'

@autoinject
export class App {
    private router: Router
    private logger = getLogger('App')

    configureRouter(config: RouterConfiguration, router: Router) {
        config.title = 'Shopadoo'
        config.map([
            {
                route: ['', 'MyLists'],
                name: 'MyLists',
                moduleId: PLATFORM.moduleName('Views/my-lists'),
                title: 'My Lists'
            },
            {
                route: 'ListAdd',
                name: 'ListAdd',
                moduleId: PLATFORM.moduleName('Views/list-add-edit'),
                title: 'Add List'
            },
            {
                route: 'ListAddShared/:id?',
                name: 'ListAddShared',
                moduleId: PLATFORM.moduleName('Views/list-add-shared'),
                title: 'Add Shared List'
            },
            {
                route: 'ListEdit/:id',
                name: 'ListEdit',
                moduleId: PLATFORM.moduleName('Views/list-add-edit'),
                title: 'Edit List'
            },
            {
                route: 'List/:id',
                name: 'List',
                moduleId: PLATFORM.moduleName('Views/list'),
                title: 'List'
            },
            {
                route: 'ItemAdd/:listId',
                name: 'ItemAdd',
                moduleId: PLATFORM.moduleName('Views/item-add-edit'),
                title: 'Add Item'
            },
            {
                route: 'ItemEdit/:listId/:id',
                name: 'ItemEdit',
                moduleId: PLATFORM.moduleName('Views/item-add-edit'),
                title: 'Edit Item'
            },
            {
                route: 'Settings',
                name: 'Settings',
                moduleId: PLATFORM.moduleName('Views/settings'),
                title: 'Settings'
            },
            {
                route: 'About',
                name: 'About',
                moduleId: PLATFORM.moduleName('Views/about'),
                title: 'About'
            }
        ])

        this.router = router
    }

    constructor(
        private appService: AppService,
        private listService: ListService,
        private storageService: StorageService,
        private syncService: SyncService,
        private backupService: BackupService,
        private webEventService: WebEventService,
        private eventAggregator: EventAggregator,
    ) {
        // handle the web/app css
        if (!system.Info.isInstalled)
            document.body.classList.add('web-background')
        this.appService.onVisibilityChanged.on(visible => {
            if (visible)
                system.Info.isInstalled
                    ? document.body.classList.remove('web-background')
                    : document.body.classList.add('web-background')
        })

        storageService.loadSettings()
        storageService.loadLists()

        eventAggregator.subscribeOnce('router:navigation:complete', response => {
            this.storageService.executeOnDataLoaded(() => {
                this.syncService.scheduleDownSync()
                this.syncService.scheduleUpSync()
            })
        })

        document.addEventListener('contextmenu', function (e) {
            // enable contextmenu on text input elements
            if (!['textarea', 'text'].includes((<HTMLInputElement>(<unknown>e.target)).type)) {
                e.preventDefault()
                return false
            }
        })

        webEventService.init()
        this.initServiceWorker()
    }

    private async initServiceWorker() {
        if ('serviceWorker' in navigator) {

            navigator.serviceWorker.register('/service-worker.js').then(registration => {
                console.info('SW registered: ', registration)
            }).catch(registrationError => {
                console.error('SW registration failed: ', registrationError)
            })
        }
    }
}
