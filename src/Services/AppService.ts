import { autoinject } from 'aurelia-framework'
import { DialogService, DialogCancellableOpenResult } from 'aurelia-dialog'
import { getLogger } from 'aurelia-logging'

import * as system from 'System/index'
import { ModalDialog, IModalDialogModel } from 'Components/modal-dialog'
import { SettingsService } from 'Services/SettingsService'
import { IOneDriveError } from 'Interfaces/IOneDrive'
import { CustomError } from 'Models/errors'
import { Errors } from 'errors'

@autoinject
export class AppService {
    private logger = getLogger('AppService')
    private loggedInWarningShowed: boolean
    private offlineWarningShowed: boolean

    hasRootRequest: boolean
    myListsScrollPosition: number

    private onVisibilityChangedEvent = new system.LiteEvent<boolean>()
    public get onVisibilityChanged(): system.ILiteEvent<boolean> { return this.onVisibilityChangedEvent }

    constructor(private dialogService: DialogService, private settingsService: SettingsService) {
        //// https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API
        if (typeof document.hidden != undefined) {
            document.addEventListener('visibilitychange', () => {
                if (!document['hidden']) {
                    console.info('document visibility changed to visible')
                    ga('send', 'screenview', { screenName: 'Home (visibilitychange)' })
                }
                else {
                    console.info('document visibility changed to in-visible')
                }
                this.onVisibilityChangedEvent.trigger(!document['hidden'])
            })
        }
    }

    setStatusBarBackgroundColor(color: string) {
        if (!color)
            color = system.Info.accentColor

        document.head.querySelector('meta[name="theme-color"]')
            .setAttribute('content', color)
    }

    trySilentLogin(showWarning = true) {
        this.settingsService.storageProvider.authService.login(true)
            .then(loggedIn => {
                if (showWarning && !loggedIn)
                    this.showNotLoggedInWarning()
            })
            .catch(error => {
                if (showWarning)
                    this.showNotLoggedInWarning()
            })
    }

    getDialogModelFromError(error: any): IModalDialogModel {
        let dialogModel: IModalDialogModel = { text: undefined }

        if (error) {

            if (!navigator.onLine) {
                if (this.offlineWarningShowed)
                    return

                this.offlineWarningShowed = true
                dialogModel.title = 'Connection failed'
                dialogModel.text = 'It seems you are offline. For a successfully synchronization you need a internet connection.'
            }
            
            if (error.responseJSON && error.responseJSON.error) {
                let oneDriveError = error.responseJSON.error as IOneDriveError
                if (oneDriveError.code == 'quotaLimitReached') {
                    dialogModel.title = 'Upload to OneDrive failed'
                    dialogModel.text = 'Insufficient space available. Make sure there is some free storage on OneDrive.'
                }
            }

            if (error.code) {
                let ce = error as CustomError
                if (ce.code == Errors.authError) {
                    return // we don't show a warning so far.
                    // TODO: don't show a warning every time we are offline. 
                    // We should do a proper merge and proper sync.
                    if (this.offlineWarningShowed)
                        return

                    this.offlineWarningShowed = true
                    dialogModel.title = 'Login failed'
                    dialogModel.text = 'It seems you are offline. For a successfully synchronization you need a internet connection.'
                }
            }

            //// Win Auth error: -2146697211
            //// File not found: -2147012889
            //// readyState: https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/readyState
            //// status: http://stackoverflow.com/questions/3825581/does-an-http-status-code-of-0-have-any-meaning
            if (error.number == -2146697211 || error.number == -2147012889 || (error.readyState == 0 && error.status == 0)) {
                dialogModel.title = 'Connection failed'
                dialogModel.text = 'It seems you are offline or the storage provider is not reachable.'
            }

            //// set default error text for undefined errors
            if (dialogModel.text == undefined) {
                this.logger.error('Undefined Dialog Model Error', error)
                dialogModel.title = 'Error occurred'
                dialogModel.text = 'An unknown error occurred. We try to address this error in future releases. Sorry about that.'
            }
        }

        return dialogModel
    }

    showDialog(dialogInfo: IModalDialogModel): Promise<DialogCancellableOpenResult> {
        if (dialogInfo && (dialogInfo.title || dialogInfo.text)) {
            if (!dialogInfo.title)
                dialogInfo.title = 'Error occurred'

            if (this.dialogService.hasActiveDialog) {
                let activeDialog = this.dialogService.controllers.find(d => (<any> d).viewModel.title == dialogInfo.title && (<any> d).viewModel.text == dialogInfo.text)
                if (activeDialog) {
                    return //Promise.resolve(undefined)
                }
            }

            return this.dialogService.open({
                viewModel: ModalDialog, model: dialogInfo
            })
        }
    }

    showNotLoggedInWarning() {
        if (!this.loggedInWarningShowed) {
            this.loggedInWarningShowed = true
            this.showDialog(
                {
                    title: 'Login to synchronies changes',
                    text: 'You are not logged in. Go to \'Settings\' and log in or unsubscribe from shared lists and disable synchronization.'
                })
                .then(result => {
                    //// todo: if offline, don`t ask, if bad connection, ask
                    //// if user don`t like to login, don`t bother again/open the login screen

                    // if (!result.wasCancelled) {
                    //     this.settingsService.storageProvider.authService.login(false)
                    //         .catch(error => {
                    //             this.logger.warn('Error on login: ', error)

                    //         })
                    // }
                })
        }
    }
}