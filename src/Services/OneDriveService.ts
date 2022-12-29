import { Logger } from 'aurelia-logging'
import { HttpClient } from 'aurelia-fetch-client'

import * as system from 'System/index'
import { IDriveService, IDriveItem, IDrivePermission } from 'Interfaces/IDriveService'
import { IAuthService } from 'Interfaces/IAuthService'
import { ToDoList, IToDoList } from 'Models/ToDoList'
import { ToDoItem, IToDoItem } from 'Models/ToDoItem'
import { IDelta, IOneDriveItem, IOneDriveError, ISharedItem, ISearchResult } from 'Interfaces/IOneDrive'
import { SettingsService } from 'Services/SettingsService'
import { DriveItem } from 'Models/DriveItem'

// import 'fetch'

export class OneDriveService implements IDriveService {
    hasBackup: boolean
    lastBackupDate: string
    rootUrl: string

    constructor(private authService: IAuthService, private settingsService: SettingsService, private logger: Logger) {
        this.rootUrl = system.Info.isDevMode ? settingsService.oneDriveDevRootUrl : settingsService.oneDriveRootUrl
    }

    private getBaseUrl(fullApiPath: string, ...params: string[]): string {
        let parameters = ''
        if (params && params.length) {
            parameters += params.join('&') + '&'
        }

        if (!this.authService.token)
            this.logger.error('getBaseUrl request and no token is provided', new Error('The access-token for one-drive is empty. You have to login first.'))

        return `https://api.onedrive.com/v1.0/${fullApiPath}?${parameters}access_token=${this.authService.token}`
    }

    private getRootUrl(apiPath: string, ...params: string[]): string {
        return this.getBaseUrl(`drive/root:/${this.rootUrl}/` + apiPath, ...params)
    }

    async getChanges(): Promise<IDriveItem[]> {
        //// https://dev.onedrive.com/items/view_delta.htm

        let url: string
        if (this.settingsService.settings.oneDriveDeltaToken) {
            url = this.getRootUrl(':/view.delta', 'token=' + this.settingsService.settings.oneDriveDeltaToken)
        }
        else {
            url = this.getRootUrl(':/view.delta', 'token=latest')
        }

        let driveItems = new Array<IDriveItem>()

        let doRequest = async () => {
            let response = await this.settingsService.httpClient.fetch(url)
            let data = await response.json() as IDelta
            if (response.ok) {
                this.settingsService.settings.oneDriveDeltaToken = data['@delta.token']
                for (let i of data.value) {
                    driveItems.push(new DriveItem(i))
                }
                // load more changes if available
                // https://dev.onedrive.com/items/view_delta.htm
                if (data['@odata.nextLink'] != undefined) {
                    console.log('More items to download...')
                    await doRequest()
                }
            }
            else {
                let error = data as any as IOneDriveError
                this.logger.error('Error at getChanges.', error)

                if (error.code == 'resyncRequired') {
                    this.settingsService.settings.oneDriveDeltaToken = undefined
                }

                this.logger.error('getChanges response failed', error)
                throw new Error('getChanges response failed with ' + response.status)
            }
        }
        await doRequest()

        return driveItems
    }

    // TODO: check next result link (like in getChanges())
    async search(term: string): Promise<IDriveItem[]> {
        let url = this.getRootUrl(':/view.search', 'q=' + encodeURIComponent(term))

        let response = await this.settingsService.httpClient.fetch(url)
        if (response.ok) {
            let result = await response.json() as ISearchResult
            return result.value.map(i => new DriveItem(i))
        }
        else {
            this.logger.error('Response failed', response)
            throw new Error('Response failed with ' + response.status)
        }
    }

    // TODO: check next result link (like in getChanges())
    async getChildren(): Promise<IDriveItem[]> {
        let url = this.getRootUrl(':/children')

        let response = await this.settingsService.httpClient.fetch(url)
        if (response.ok) {
            let result = await response.json() as ISearchResult
            return result.value.map(i => new DriveItem(i))
        }
        else {
            this.logger.error('Response failed', response)
            throw new Error('Response failed with ' + response.status)
        }
    }

    downloadFile(fileName: string, format: 'string' | 'json'): Promise<any> {
        let url = this.getRootUrl(fileName + ':/content')
        return this.settingsService.httpClient.fetch(url)
            .then(response => {
                if (response.ok) {
                    if (format == 'string')
                        return response.text()
                    else
                        return response.json()
                }
                else {
                    return Promise.reject(response)
                }
            })
            .catch(error => {
                this.logger.error('Error at downloadFile.', error)
                return Promise.reject(error)
            })
    }

    uploadFile(fileName: string, content: string | object): Promise<IDriveItem> {
        let headers = new Headers()
        let body: string
        if (typeof content == 'string') {
            headers.append('Content-Type', 'text/plain; charset=utf-8')
            body = content
        }
        else {
            headers.append('Content-Type', 'application/json; charset=utf-8')
            body = JSON.stringify(content)
        }

        console.log('uploadFile ' + fileName)
        let url = this.getRootUrl(fileName + ':/content')
        return this.settingsService.httpClient.fetch(url, {
            method: 'PUT',
            headers: headers,
            body: body
        })
            .then(response => {
                if (response.ok) {
                    return response.json().then((data: IOneDriveItem) => {
                        return new DriveItem(data)
                    })
                }
                else {
                    return Promise.reject(response)
                }
            })
            .catch(error => {
                this.logger.error('Error at uploadFile.', error)
                return Promise.reject(error)
            })
    }

    deleteFile(fileName: string): Promise<void> {
        let url = this.getRootUrl(fileName)
        return this.settingsService.httpClient.fetch(url, {
            method: 'DELETE'
        })
            .then(response => {
                if (response.ok) {
                    return Promise.resolve()
                }
                else {
                    return Promise.reject(response)
                }
            })
            .catch(error => {
                this.logger.error('Error at deleteFile.', error)
                return Promise.reject(error)
            })
    }

    downloadFileMetadata(fileName: string): Promise<IOneDriveItem> {
        let url = this.getRootUrl(fileName)
        return this.settingsService.httpClient.fetch(url)
            .then(response => {
                if (response.ok) {
                    return response.json() as Promise<IOneDriveItem>
                }
                else {
                    return Promise.reject(response)
                }
            })
            .catch(error => {
                this.logger.error('Error at downloadFileMetadata.', error)
                return Promise.reject(error)
            })
    }

    getPermissions(fileName: string): Promise<IDrivePermission[]> {
        let url = this.getRootUrl(fileName + ':/permissions/')
        return this.settingsService.httpClient.fetch(url)
            .then(response => {
                return response.json() as Promise<IDrivePermission[]>
            })
            .catch(error => {
                this.logger.error('Error at getPermissions.', error)
                return Promise.reject(error)
            })

    }

    getShareLink(fileName: string): Promise<string> {
        let url = this.getRootUrl(fileName + ':/action.createLink')
        let headers = new Headers()
        headers.append('Content-Type', 'application/json; charset=utf-8')

        return this.settingsService.httpClient.fetch(url, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({ type: 'edit' })
        })
            .then(response => response.json() as any)
            .then(data => {
                return Promise.resolve(data.link.webUrl)
            })
            .catch(error => {
                this.logger.error('Error on getShareLink.', error)
                return Promise.reject(error)
            })
    }

    removeShareLink(fileName: string, permissionId: string): Promise<void> {
        let url = this.getRootUrl(fileName + ':/permissions/' + permissionId)
        return this.settingsService.httpClient.fetch(url, {
            method: 'DELETE'
        })
            .then(response => {
                //// ignore http state errors here
                return Promise.resolve()
            })
            .catch(error => {
                return Promise.reject(error)
            })
    }

    downloadSharedFileMetadata(surl: string): Promise<IDriveItem> {
        // https://dev.onedrive.com/shares/shares.htm
        let base64Value = btoa(surl)
        if (base64Value.endsWith('='))
            base64Value = base64Value.substring(0, base64Value.length - 1)
        let encodedUrl = 'u!' + base64Value.replace('/', '_').replace('+', '-')
        let url = `https://api.onedrive.com/v1.0/shares/${encodedUrl}/root`

        return this.settingsService.httpClient.fetch(url)
            .then(response => {
                if (response.ok) {
                    return response.json() as Promise<IOneDriveItem>
                }
                else {
                    return Promise.reject(response)
                }
            })
            .then(data => {
                return Promise.resolve(new DriveItem(data)) as Promise<IDriveItem>
            })
            .catch(error => {
                return Promise.reject(error)
            })
    }

    downloadSharedFile(surl: string, format: 'string' | 'json'): Promise<any> {
        // https://dev.onedrive.com/shares/shares.htm
        let base64Value = btoa(surl)
        if (base64Value.endsWith('='))
            base64Value = base64Value.substring(0, base64Value.length - 1)
        let encodedUrl = 'u!' + base64Value.replace('/', '_').replace('+', '-')
        let url = `https://api.onedrive.com/v1.0/shares/${encodedUrl}/root/content`

        return this.settingsService.httpClient.fetch(url)
            .then(response => {
                if (response.ok) {
                    if (format == 'string')
                        return response.text()
                    else
                        return response.json()
                }
                else {
                    return Promise.reject(response)
                }
            })
            .catch(error => {
                console.log('Error at OneDriveService.downloadSharedFile() >>')
                console.log(error)
                return Promise.reject(error)
            })
    }

    uploadSharedFile(surl: string, content: string): Promise<void> {
        let base64Value = btoa(surl)
        if (base64Value.endsWith('='))
            base64Value = base64Value.substring(0, base64Value.length - 1)
        let encodedUrl = 'u!' + base64Value.replace('/', '_').replace('+', '-')
        let url = this.getBaseUrl('shares/' + encodedUrl + '/root/content')

        let headers = new Headers()
        headers.append('Content-Type', 'application/json; charset=utf-8')

        return this.settingsService.httpClient.fetch(url, {
            method: 'PUT',
            headers: headers,
            body: content
        })
            .then(response => {
                if (response.ok) {
                    console.log('uploadSharedFile() file done')
                    return Promise.resolve()
                }
                else {
                    return Promise.reject(response)
                }
            })
            .catch(error => {
                return Promise.reject(error)
            })
    }

    checkBackup() {
        this.downloadFileMetadata(this.settingsService.backupFileName)
            .then(response => {
                this.hasBackup = true
                this.lastBackupDate = new Date(response.lastModifiedDateTime).toLocaleDateString()
            })
            .catch(error => {
                this.hasBackup = false
            })
    }
}