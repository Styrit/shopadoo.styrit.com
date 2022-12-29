import { autoinject, TaskQueue, LogManager } from 'aurelia-framework'
import { Router, Redirect, RedirectToRoute } from 'aurelia-router'
import { Logger } from 'aurelia-logging'

import { DialogService } from 'aurelia-dialog'
import { ModalDialog, IModalDialogModel } from 'Components/modal-dialog'
import basicContext from 'basiccontext'


import * as system from 'System/index'
import { StorageService } from 'Services/StorageService'
import { ListService } from 'Services/ListService'
import { UIHelper } from 'Helper/UIHelper'
import { ToDoList } from 'Models/ToDoList'
import { SettingsService } from 'Services/SettingsService'
import { AppService } from 'Services/AppService'

@autoinject
export class MyListsViewModel {
    private logger: Logger = LogManager.getLogger('MyListsViewModel')

    itemsDraggable: boolean
    scrollCompleted: boolean

    constructor(
        private router: Router,
        private appService: AppService,
        private listService: ListService,
        private settingsService: SettingsService,
        private storageService: StorageService,
        private dialogService: DialogService,
        private taskQueue: TaskQueue
    ) { }

    private canActivate(): any {
    }

    private activate() {
        this.appService.setStatusBarBackgroundColor(system.Info.accentColor)
        this.appService.hasRootRequest = true
        this.scrollCompleted = false
    }

    private attached() {
        
    }

    private canDeactivate() {
        this.appService.myListsScrollPosition =
            document.querySelector('.listViewContainer').scrollTop
    }

    private detached() {
    }

    onClick(item: ToDoList) {
        this.router.navigateToRoute('List', {
            id: item.id
        })
    }

    onContextmenu(item: ToDoList, event: Event) {
        this.showContextMenu(item, event)
    }

    sortClick() {
        this.itemsDraggable = !this.itemsDraggable
    }

    addClick() {
        this.router.navigateToRoute('ListAdd')
    }

    settingsClick() {
        this.router.navigateToRoute('Settings')
    }

    aboutClick() {
        this.router.navigateToRoute('About')
    }

    private showContextMenu(item: ToDoList, event: Event) {
        let htmlItem = (event.target as HTMLElement).closest('.list-item-template') as HTMLElement
        if (htmlItem) {
            //// Highlight item as selected
            htmlItem.classList.add('has-menu')

            let items = [
                {
                    title: 'Edit', icon: 'icon icon-edit', fn: () => {
                        this.router.navigateToRoute('ListEdit', { id: item.id })
                    }
                },
                {
                    title: 'Send To', icon: 'icon icon-send', fn: () => {
                        item.share()
                    }
                },
                {
                    title: 'Delete', icon: 'icon icon-delete', fn: () => {
                        this.dialogService.open({
                            viewModel: ModalDialog, model: <IModalDialogModel> {
                                title: 'Are you sure?',
                                text: `Are you sure you want to delete the list '${item.name}'?`,
                                showCancelButton: true,
                                yesNo: true
                            }
                        })
                            .whenClosed(response => {
                                if (!response.wasCancelled) {
                                    //// delete list immediately if sync is enabled
                                    if ((this.settingsService.settings.syncData || item.shared)) {
                                        this.settingsService.storageProvider.authService.login(false)
                                            .then(loggedIn => {
                                                this.settingsService.storageProvider.driveService.deleteFile(item.fileName)
                                                    .catch((error) => {
                                                        console.log('Deletion failed: ' + error.statusText)
                                                    })
                                            })
                                            .catch(error => {
                                                this.logger.error('error on login', error)
                                            })
                                    }
                                    this.listService.myLists.delete(item)
                                }
                            })
                    }
                }
            ]

            basicContext.show(items, event, () => {
                basicContext.close(event)
                htmlItem.classList.remove('has-menu')
            })
        }
        else {
            console.error('html item not found')
        }
    }
}