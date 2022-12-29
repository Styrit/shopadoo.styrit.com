import { LogManager } from 'aurelia-framework'
import { Logger } from 'aurelia-logging'
import { HttpClient } from 'aurelia-fetch-client'

import secrets from '../../config/secrets.json'

import { Settings, ISettings } from 'Models/Settings'
import { AuthService } from 'Services/AuthService'
import { IAuthService, IProviderInfo, IStorageProvider } from 'Interfaces/IAuthService'
import { OneDriveService } from 'Services/OneDriveService'
//import { GoogleDriveService } from 'Services/GoogleDriveService'
import { AppService } from 'Services/AppService'

// TODO: lazy injection of StorageProviders - not possible due the various parameters?
//// http://aurelia.io/hub.html#/doc/article/aurelia/dependency-injection/latest/dependency-injection-basics/6
export class SettingsService {
    private logger: Logger = LogManager.getLogger('SettingsService')

    readonly downSyncPollingSeconds = 30
    readonly upSyncChangesAfterSeconds = 10
    readonly oneDriveRootUrl = 'ProgramData/Shopadoo'
    readonly oneDriveDevRootUrl = 'ProgramData/ShopadooDev'
    readonly backupFileName = 'lists.backup'
    readonly colorMap = this.getColorMap()

    settings = new Settings()
    httpClient = new HttpClient()
    storageProviderList = new Array<IStorageProvider>()

    //// storageProvider
    private _storageProvider: IStorageProvider
    get storageProvider(): IStorageProvider {
        if (this._storageProvider == undefined) {
            let syncProviderId = this.settings.storageProvider || 'OneDrive' // => default value
            let selectedStorageProvider = this.storageProviderList.length == 1 ? this.storageProviderList[0] : this.storageProviderList.find(d => d.id == syncProviderId)
            this.initStorageProvider(selectedStorageProvider)
            this._storageProvider = selectedStorageProvider
        }

        return this._storageProvider
    }
    set storageProvider(value: IStorageProvider) {
        this.initStorageProvider(value)
        this._storageProvider = value
        this.settings.storageProvider = value.id

        console.log('New storage provider is: ' + value.id)
    }

    constructor() {
        this.httpClient.configure(config => {
            // not everything is json...
            // let headers = new Headers()
            // headers.append('Content-Type', 'application/json; charset=utf-8')
            // config.defaults.headers = headers

            config.defaults.mode = 'cors'
            config.defaults.credentials = 'omit'
        })

        this.storageProviderList.push({ id: 'OneDrive', name: 'OneDrive', authService: undefined, driveService: undefined, syncSupport: true })
        // this.storageProviderList.push({ id: 'GoogleDrive', name: 'Google Drive', authService: undefined, driveService: undefined, syncSupport: false })
    }

    getHexColorFromKey(key: string): string {
        //// for backward compatibility
        if (key && key.startsWith('#'))
            return key

        //// if it is the default color, return none
        if (key && key == 'default')
            return undefined

        return key && this.colorMap.has(key) ? this.colorMap.get(key).hex : undefined
    }

    private initStorageProvider(storageProvider: IStorageProvider): void {
        if (storageProvider.authService)
            return

        /*
         About storing the Client Secrete (applicationSecret) in the app:

         DO NOT DO THIS! If you put your client secret in your app, it doesn't matter whether it is in a config file or hardcoded, 
         PEOPLE WILL ACCESS IT. If someone gains access to your client secret they can act as though they are your app, 
         consume your API limits and generally give you a very bad day.

         Personal note: Yes but lol.. it's a client (app).
        */
        // this url has to be registered at https://apps.dev.microsoft.com
        let authCallbackPath = '/auth-callback.html'

        switch (storageProvider.id) {
            case 'OneDrive':
                let oneDriveAuthService: IAuthService
                let oneDriveParams: IProviderInfo = {
                    providerId: storageProvider.id,
                    endpoint: 'https://login.live.com/oauth20_authorize.srf',
                    clientId: secrets.oneDriveClientId,
                    scopes: 'onedrive.readwrite wl.offline_access wl.signin',
                    authCallbackPath: authCallbackPath,
                    redirectUri: location.origin + authCallbackPath
                }

                oneDriveAuthService = new AuthService(oneDriveParams, this.logger, this.httpClient)

                storageProvider.authService = oneDriveAuthService
                storageProvider.driveService = new OneDriveService(oneDriveAuthService, this, this.logger)

                break

            case 'GoogleDrive':
                let googleDriveAuthService: IAuthService
                let googleDriveParams: IProviderInfo = {
                    providerId: storageProvider.id,
                    endpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
                    clientId: secrets.googleDriveClientId,
                    scopes: 'https://www.googleapis.com/auth/drive.appfolder',
                    authCallbackPath: authCallbackPath,
                    redirectUri: location.origin + authCallbackPath
                }

                googleDriveAuthService = new AuthService(googleDriveParams, this.logger, this.httpClient)

                storageProvider.authService = googleDriveAuthService
                //storageProvider.driveService = new GoogleDriveService(storageProvider.authService, this, this.logger)

                break
        }
    }

    private getColorMap(): Map<string, { hex: string, name: string }> {
        //// Important: only insert hex values - live tile color is using this value

        let colorMap = new Map<string, { hex: string, name: string }>()
        colorMap.set('default', { hex: '#d3d3d3', name: 'Default Color' })
        colorMap.set('green', { hex: '#7bd148', name: 'Green' })
        colorMap.set('bold-blue', { hex: '#5484ed', name: 'Bold blue' })
        colorMap.set('blue', { hex: '#a4bdfc', name: 'Blue' })
        colorMap.set('turquoise', { hex: '#46d6db', name: 'Turquoise' })
        colorMap.set('teal', { hex: '#00aba9', name: 'Teal' })
        //colorMap.set('light-green', { hex: '#7ae7bf', name: 'Light green' })
        colorMap.set('bold-green', { hex: '#51b749', name: 'Bold green' })
        colorMap.set('yellow', { hex: '#ffcc00', name: 'Yellow' })
        colorMap.set('orange', { hex: '#fa6800', name: 'Orange' })
        colorMap.set('red', { hex: '#ff3300', name: 'Red' })
        //colorMap.set('bold-red', { hex: '#cd201f', name: 'Bold red' })
        colorMap.set('magenta', { hex: '#d80073', name: 'Magenta' })
        colorMap.set('purple', { hex: '#dbadff', name: 'Purple' })

        return colorMap
    }
}