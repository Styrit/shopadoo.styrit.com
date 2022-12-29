import { autoinject, TaskQueue } from 'aurelia-framework'
import { Router } from 'aurelia-router'

import { ListService } from 'Services/ListService'
import { ToDoList, IToDoList } from 'Models/ToDoList'
import { SettingsService } from 'Services/SettingsService'

@autoinject
export class ListAddEditViewModel {
    private readonly oneDriveBaseUrl = 'https://1drv.ms/'
    private readonly indexOfAddSharedUrl = 'ListAddShared/'

    statusText: string
    sharedUrl: string
    sharedList: IToDoList
    hasId: boolean

    constructor(
        private taskQueue: TaskQueue,
        private router: Router,
        private listService: ListService,
        private settingsService: SettingsService) {
    }

    private activate(params, routeConfig, navigationInstruction) {
        if (params.id) {
            // http://localhost:9000/#/ListAddShared/u%2Fs!AtTwBHda4_mvlbB5XfFUzw0b7sCMvw
            let decodedParam = decodeURIComponent(params.id)
            this.sharedUrl = this.oneDriveBaseUrl + decodedParam
            this.hasId = true

            this.statusText = 'Finding shared list...'
            this.findList(this.sharedUrl)
        }
        else {
            this.statusText = 'Please enter a shared url and press \'Find list\'.'
        }
    }

    private attached() {
        (document.querySelector('#url') as HTMLTextAreaElement)
            .addEventListener('paste', event => {
                this.taskQueue.queueTask(() => {
                    let input = event.target as HTMLInputElement

                    let startIndex = input.value.indexOf('http')
                    if (startIndex > 0)
                        this.sharedUrl = input.value.substring(startIndex)
                })
            })
    }

    private detached() {
    }

    findList(url: string) {
        if (!url) {
            this.statusText = `Please enter a shared url.`
            return
        }

        let oneDriveSharedUrl = this.normalizeUrl(url)

        let existingList = this.listService.myLists.find(list => list.shared && list.shared.url == oneDriveSharedUrl)
        if (existingList) {
            this.statusText = `The list '${existingList.name}' is already in your lists.`
        }
        else {
            this.settingsService.storageProvider.driveService.downloadSharedFileMetadata(oneDriveSharedUrl)
                .then(metadata => {
                    console.log('getSharedFile() >>')
                    console.log(metadata)

                    this.settingsService.storageProvider.driveService.downloadSharedFile(oneDriveSharedUrl, 'json')
                        .then((list: IToDoList) => {
                            this.sharedList = list
                            this.sharedList.shared = { url: oneDriveSharedUrl, userId: metadata.userId, userName: metadata.userName }
                            this.statusText = `Found shared list <b>'${this.sharedList.name}'</b> from the owner ${metadata.userName || metadata.userId}.`
                        })
                        .catch(error => {
                            this.statusText = 'Error on downloading the list.'
                        })
                })
                .catch(error => {
                    this.statusText = 'Error on finding the shared list.'
                    console.log('getSharedFileMetadata() >>')
                    console.log(error)
                })
        }
    }

    addList() {
        this.listService.addOrUpdateList(this.sharedList)
        this.router.navigateToRoute('MyLists')
    }

    private normalizeUrl(url: string): string {
        let startIndex = url.indexOf(this.indexOfAddSharedUrl)
        if (startIndex > 0) {
            url = this.oneDriveBaseUrl + decodeURIComponent(url.substring(startIndex + this.indexOfAddSharedUrl.length))
        }
        return url
    }
}