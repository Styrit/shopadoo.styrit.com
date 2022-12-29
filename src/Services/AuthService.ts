import { Logger } from 'aurelia-logging'
import { HttpClient } from 'aurelia-fetch-client'

import * as system from 'System/index'
import { IAuthService, IProviderInfo } from 'Interfaces/IAuthService'
import { UIHelper } from 'Helper/UIHelper'
import { CustomError } from 'Models/errors'
import { Errors } from 'errors'

// import 'fetch'

// https://developers.google.com/identity/protocols/OAuth2UserAgent

class AuthInfo {
    token: string
    expire: number
    error: Error
    userId: string
    scope: string
}

export class AuthService implements IAuthService {
    private authorizationProgress: Promise<boolean>

    private _userId: string = undefined
    public get userId(): string { return this._userId }
    protected setUserId(userId: string) {
        this._userId = userId
    }

    private _token: string = undefined
    public get token(): string { return this._token }
    protected setToken(token: string) {
        if (token != this._token) {
            this._token = token
            this.loggedIn = !!token
        }
    }

    public loggingIn = false
    public loggedIn = false

    protected onUserLoggedInEvent = new system.LiteEvent<void>()
    public get onUserLoggedIn(): system.ILiteEvent<void> { return this.onUserLoggedInEvent }

    constructor(protected providerInfo: IProviderInfo, protected logger: Logger, protected client: HttpClient) {
        if (!providerInfo.providerId) {
            throw 'providerInfo object should have `providerInfo` property set to your provider id'
        }

        if (!providerInfo.clientId) {
            throw 'providerInfo object should have `clientId` property set to your application id'
        }

        if (!providerInfo.scopes) {
            throw 'providerInfo object should have `scopes` property set to the scopes your app needs'
        }

        if (!providerInfo.redirectUri) {
            throw 'providerInfo object should have `redirectUri` property set to your redirect landing url'
        }
    }

    login(isSilent = true): Promise<boolean> {
        let token = this.getTokenFromCookie(this.providerInfo.providerId)
        // 'undefined' is stored in cookie at the shopadoo app - so we have to handle that here
        // if (token)
        if (token && token != 'undefined') {
            this.setToken(token)

            if (!isSilent)
                this.onUserLoggedInEvent.trigger()

            return Promise.resolve(this.loggedIn)
        }

        if (!this.authorizationProgress || !isSilent) {
            this.logger.info('Authorization progress started.')
            this.loggingIn = true
            this.authorizationProgress = this.startAuthorization(this.providerInfo, isSilent)
                .then((loggedIn) => {
                    this.authorizationProgress = undefined
                    this.loggingIn = false
                    this.logger.info('Authorization progress ended.')

                    return Promise.resolve(loggedIn)
                })
                .catch(error => {
                    this.logger.warn('startAuthorization error', error)
                    this.logout(false)

                    this.authorizationProgress = undefined
                    this.loggingIn = false
                    const msg = 'Authorization progress ended with an error.'
                    this.logger.info(msg)

                    // throw error - do not work
                    // return error - do not work
                    // Note: error = false here...
                    return Promise.reject(msg)
                })
        }
        else {
            this.logger.info('Authorization already ongoing, this request will be skipped.')
        }
        return this.authorizationProgress
    }

    logout(fullLogout = true) {
        if (fullLogout && this.token) {
            if (this.providerInfo.endpoint.startsWith('https://accounts.google.com')) {
                this.client.fetch('https://accounts.google.com/o/oauth2/revoke?token=' + this.token)
            }

            if (this.providerInfo.endpoint.startsWith('https://login.live.com')) {
                let url = 'https://login.live.com/oauth20_logout.srf' +
                    '?client_id=' + this.providerInfo.clientId +
                    '&redirect_uri=' + encodeURIComponent(this.providerInfo.redirectUri) +
                    '&display=none'

                UIHelper.loadUrlInIframe(url)
            }
        }

        // cancel authorization progress if still ongoing
        this.authorizationProgress = undefined

        // delete cookie
        this.setCookie(this.providerInfo.providerId, undefined, 0)
        this.setToken(undefined)
    }

    protected getAuthUrl(): string {
        let url =
            this.providerInfo.endpoint +
            '?client_id=' + this.providerInfo.clientId +
            '&scope=' + encodeURIComponent(this.providerInfo.scopes) +
            '&response_type=token' +
            '&redirect_uri=' + encodeURIComponent(this.providerInfo.redirectUri)
        return url
    }

    protected startAuthorization(providerInfo: IProviderInfo, isSilent = true): Promise<boolean> {
        return new Promise<boolean>((resolve, reject) => {
            let progressDone = false
            window.setTimeout(() => {
                // cancel progress if not in time limit
                if (isSilent && !progressDone) {
                    this.authorizationProgress = undefined
                    reject(new CustomError('Authorization progress not finished within the time limit.', Errors.authError))
                }
            }
                , 5000)

            let onMessage = (event: MessageEvent) => {
                if ((<Window>event.source).location.pathname != this.providerInfo.authCallbackPath) {
                    this.logger.info('Unknown message event skipped.')
                    return
                }

                progressDone = true
                this.logger.info('startAuthorization event received >>', event)
                window.removeEventListener('message', onMessage)

                // Todo: skip the message addressed to another client or came from unknown location
                // if (this.providerInfo.clientId !== data.clientId) return false
                // if (this.providerInfo.redirectOrigin !== event.origin) return false

                let authInfo = this.getAuthInfoFromUrl(event.data)
                if (authInfo && authInfo.error == undefined && authInfo.token) {
                    this.setUserId(authInfo.userId)
                    this.setCookie(this.providerInfo.providerId, authInfo.token, authInfo.expire)
                    this.setToken(authInfo.token)

                    if (!isSilent)
                        this.onUserLoggedInEvent.trigger()

                    resolve(this.loggedIn)
                }
                else {
                    if (authInfo && authInfo.error && authInfo.error.name == 'access_denied') {
                        this.logger.warn(authInfo.error.message)
                        this.loggedIn = false
                        resolve(this.loggedIn)
                    }
                    else {
                        reject(authInfo && authInfo.error || 'authInfo or token is undefined')
                    }
                }
            }
            // listen for callback's message with auth token
            window.addEventListener('message', onMessage, false)

            let url = this.getAuthUrl()
            if (!isSilent) {
                let popupWindow = this.popup(url)
                if (popupWindow) {
                    // https://stackoverflow.com/questions/15694567/javascript-detect-closing-popup-loaded-with-another-domain
                    let interval = window.setInterval(function () {
                        if (popupWindow == null || popupWindow.closed) {
                            window.clearInterval(interval)
                            if (!progressDone) {
                                // window closed by user
                                reject(false)
                            }
                        }
                    }, 1000)
                }
                else {
                    return Promise.reject('failed to pop up auth window')
                }
            }
            else {
                // for silent authentication - just try to refresh the token, no auth flow
                if (providerInfo.providerId == 'OneDrive')
                    url += '&display=none'
                if (providerInfo.providerId == 'GoogleDrive')
                    url += '&prompt=none'

                // using XMLHttpRequest instead?
                // https://developers.google.com/api-client-library/javascript/features/cors
                UIHelper.loadUrlInIframe(url).catch(error => {
                    reject(error)
                })
            }
        })
    }

    private popup(url: string): Window {
        let width = 525,
            height = 525,
            screenX = window.screenX,
            screenY = window.screenY,
            outerWidth = window.outerWidth,
            outerHeight = window.outerHeight

        let left = screenX + Math.max(outerWidth - width, 0) / 2
        let top = screenY + Math.max(outerHeight - height, 0) / 2

        let features = [
            'width=' + width,
            'height=' + height,
            'top=' + top,
            'left=' + left,
            'status=no',
            'resizable=yes',
            'toolbar=no',
            'menubar=no',
            'scrollbars=yes'
        ]

        let popup = window.open(url, 'oauth', features.join(','))
        if (popup) {
            popup.focus()
        }
        return popup
    }

    protected getAuthInfoFromUrl(query: string): AuthInfo {
        if (query) {
            let data = query.parseQuery()
            let authInfo = new AuthInfo();
            authInfo.expire = parseInt(data.expires_in)
            authInfo.token = data.access_token
            authInfo.userId = data.user_id
            authInfo.scope = data.scope
            if (data.error_description) {
                authInfo.error = new Error(decodeURIComponent(data.error + ': ' + data.error_description))
                authInfo.error.name = data.error
            }
            return authInfo
        }
    }

    public setCookie(name: string, token: string, expireSeconds: number) {
        //// by setting the token value to '', the cookie will be deleted
        if (!token)
            token = ''

        let expiration = new Date()
        // remove 5 seconds for security
        expiration.setTime(expiration.getTime() + (expireSeconds - 5) * 1000)

        let cookie = name + '=' + token + '; path=/; expires=' + expiration.toUTCString();
        if (this.isHttps()) {
            cookie = cookie + ';secure'
        }

        document.cookie = cookie
    }

    private isHttps() {
        return window.location.protocol.toLowerCase() === 'https:'
    }

    public getTokenFromCookie(name: string): string {
        let cookies = document.cookie
        name += '='
        let start = cookies.indexOf(name)
        if (start >= 0) {
            start += name.length
            let end = cookies.indexOf(';', start)
            if (end < 0) {
                end = cookies.length
            }

            let value = cookies.substring(start, end)
            return value
        }

        return ''
    }
}