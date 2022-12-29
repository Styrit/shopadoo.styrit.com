import { autoinject, inject, TaskQueue, LogManager } from 'aurelia-framework'
import { Router } from 'aurelia-router'
import { Logger } from 'aurelia-logging'

// import Sortable from 'sortablejs'
// Core SortableJS (without default plugins)
import Sortable from 'sortablejs/modular/sortable.core.esm.js';

import { DialogService } from 'aurelia-dialog'
import { ModalDialog, IModalDialogModel } from 'Components/modal-dialog'

import * as system from 'System/index'
import { SettingsService } from 'Services/SettingsService'
import { UIHelper } from 'Helper/UIHelper'
import { ListService } from 'Services/ListService'
import { SortType } from 'Models/Enums'
import { ToDoList } from 'Models/ToDoList'
import { Group } from 'Models/Group'
import { ToDoItemComparer } from 'Helper/Comparer'
import { AppService } from 'Services/AppService'

@autoinject
export class ListAddEditViewModel {
    private logger: Logger = LogManager.getLogger('ListAddEditViewModel')

    selectedList: ToDoList
    isInEditMode: boolean = false
    sortTypeEnum = SortType // used at the view
    initHexColor: string

    private sortablejs: Sortable

    private sortablejsOptions = {
        handle: 'button.move',
        animation: 150,
        /*
        Force fallback on IE/Edge - except for windows phone because it works
        Sortable not working with <button>'s in IE and EDGE
        https://github.com/RubaXa/Sortable/issues/1050
        */
        forceFallback: false,

        onUpdate: event => {
            //// If item isn't being dropped into its original place
            if (event.newIndex != event.oldIndex) {
                //// updating an array thought indexes do not work with the aurelia binding
                //// https://github.com/aurelia/binding/issues/64

                //// http://www.w3resource.com/javascript-exercises/javascript-array-exercise-38.php
                this.selectedList.groups.splice(event.newIndex, 0, this.selectedList.groups.splice(event.oldIndex, 1)[0])
            }
        }
    }

    constructor(
        private router: Router,
        private settingsService: SettingsService,
        private listService: ListService,
        private taskQueue: TaskQueue,
        private appService: AppService,
        private dialogService: DialogService
    ) {
        this.selectedList = new ToDoList('')
    }

    private activate(params, routeConfig, navigationInstruction) {
        console.log('activate')

        if (params.id) {
            console.log('param id: ' + params.id)
            this.selectedList = this.listService.myLists.find(d => d.id == params.id)

            this.initHexColor = this.settingsService.getHexColorFromKey(this.selectedList.color)
            this.appService.setStatusBarBackgroundColor(this.initHexColor ? this.initHexColor : system.Info.accentColor)

            this.isInEditMode = true
        }
    }

    private attached() {
        this.taskQueue.queueTask(this.processUI)
        this.sortablejs = new Sortable(document.querySelector('.groups-container'), this.sortablejsOptions)
    }

    private detached() {
        //// trim list name and if empty, filled with a default value
        let newName = this.selectedList.name.trim()
        if (this.selectedList.name != newName)
            this.selectedList.name = newName

        if (!this.selectedList.name) {
            this.selectedList.name = 'List from ' + new Date().toLocaleDateString()
        }

        //// remove empty groups
        let emptyGroups = this.selectedList.groups.filter(d => !d.name)
        emptyGroups.forEach(group => {
            this.selectedList.groups.delete(group)
        })

        //// sort list
        //// error - this brakes the aurelia repeater binding if using if.bind
        this.selectedList.sortItems(true)

        try {
            this.sortablejs.destroy()
        }
        catch (error) {
            // sortablejs error, do nothing here
        }
    }

    appBarSave() {
        this.listService.myLists.unshift(this.selectedList)
        this.router.navigateBack()
    }

    private processUI = () => {
        let input = <HTMLElement> document.querySelector('input')
        if (!this.isInEditMode)
            input.focus()
        input.addEventListener('keydown', (event) => {
            console.log('Keydown keyCode: ' + event.keyCode)
            if (event.keyCode == 13) {
                if (!this.isInEditMode)
                    this.listService.myLists.push(this.selectedList)
                this.router.navigateBack()
            }
        })
    }

    stopSharing() {
        let sharedUrl = (this.selectedList.shared && this.selectedList.shared.url) ? this.selectedList.shared.url : undefined
        this.selectedList.shared = undefined

        // remove onedrive permissions if the user is the owner
        if (sharedUrl && this.settingsService.storageProvider.syncSupport) {
            this.settingsService.storageProvider.authService.login(false)
                .then(d => {
                    if (d !== true) {
                        console.log('Warning: not logged in, deleting permissions on storageProvider skipped')
                    }
                    else {
                        this.settingsService.storageProvider.driveService.getPermissions(this.selectedList.fileName)
                            .then(d => {
                                let permission = d.find(i => sharedUrl.endsWith(i.shareId))
                                if (permission) {
                                    this.settingsService.storageProvider.driveService.removeShareLink(this.selectedList.fileName, permission.id)
                                        .then(() => {
                                            console.log('Successfully deleted permission on storage provider')
                                        })
                                        .catch(error => {
                                        })
                                }
                            })
                            .catch(error => {
                            })
                    }
                })
                .catch(error => {
                    this.logger.error('login error: ', error)

                    //// TODO: if not logged in, warn
                    //this.appService.showWarning()
                })
        }
    }

    inviteOthers() {
        if (this.selectedList.shared) {
            this.shareUrl(this.selectedList.sharedShopadooUrl)
        }
        else {
            this.settingsService.storageProvider.authService.login(false)
                .then(loggedIn => {
                    if (loggedIn) {
                        this.settingsService.storageProvider.driveService.uploadFile(this.selectedList.fileName, this.selectedList.toPlainObject())
                            .then(() => {
                                this.settingsService.storageProvider.driveService.getShareLink(this.selectedList.fileName).then(surl => {
                                    this.selectedList.shared = { url: surl, userId: this.settingsService.storageProvider.authService.userId, userName: undefined }
                                    this.shareUrl(this.selectedList.sharedShopadooUrl)
                                })
                            })
                            .catch(error => {
                                this.logger.error('inviteOthers upload failed', error)
                                this.appService.showDialog({ text: 'Error on uploading the list. Make sure you have a internet connection.' })
                            })
                    }
                    else {
                        this.appService.showNotLoggedInWarning()
                    }
                })
                .catch(error => {
                    this.logger.error('login error: ', error)
                    this.appService.showDialog({ text: 'Error on login.' })
                })
        }
    }

    addGroup() {
        this.selectedList.groups.push(new Group())

        this.taskQueue.queueMicroTask(() => {
            let lastGroupInput = document.querySelector('.groups-container >div:last-child input') as HTMLInputElement
            if (lastGroupInput)
                lastGroupInput.focus()

            let btn = document.getElementById('addGroup')
            btn.scrollIntoView()
        })
    }

    onColorSelect(colorKey: string) {
        this.selectedList.color = colorKey
        this.appService.setStatusBarBackgroundColor(this.selectedList.color ? this.settingsService.getHexColorFromKey(this.selectedList.color) : system.Info.accentColor)
    }

    removeGroup(group: Group) {
        if (group.items.length) {
            this.dialogService.open({
                viewModel: ModalDialog, model: <IModalDialogModel> {
                    title: 'Are you sure?',
                    text: `The group '${group.name}' is used with some of your items. Items will be unlinked.`,
                    showCancelButton: true,
                    yesNo: true
                }
            })
                .whenClosed(response => {
                    if (!response.wasCancelled) {
                        //// copy items to the default group
                        this.selectedList.groups[0].items.push(...group.items)
                        this.selectedList.groups.delete(group)
                    }
                })
        }
        else {
            this.selectedList.groups.delete(group)
        }
    }

    pinToStart(event: Event) {
        console.log('PinToStart')

    }

    private shareUrl(surl: string) {
        let title = `You got a shared Shopadoo list`
        let content = `You got a Shopadoo Link for the list '${this.selectedList.name}'. ` +
            `Open Shopadoo and go to 'Add List' > 'Add a shared list'. ` +
            `There you can add this list with the following link: ${surl}`

        if (navigator.share) {
            navigator.share({
                title: encodeURIComponent(title),
                text: encodeURIComponent(content)
            })
                .catch((error) => this.logger.error('Error on shareUrl', error))
        }
        else {
            let email = ''
            let subject = encodeURIComponent(title)
            let emailBody = encodeURIComponent(content)
            let url = `mailto:${email}?subject=${subject}&body=${emailBody}`
            UIHelper.loadUrlInIframe(url)
        }
    }

    private _sortList: Array<{ key: number, name: string }>
    get sortList() {
        if (this._sortList == null) {
            let list = new Array<{ key: number, name: string }>()
            list.push({ key: SortType.Alphabetical, name: 'alphabetical' })
            list.push({ key: SortType.Usage, name: 'by usage' })
            list.push({ key: SortType.DateCreated, name: 'by creation date' })
            list.push({ key: SortType.Manual, name: 'manual' })
            this._sortList = list
        }
        return this._sortList
    }
}
