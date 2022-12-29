import { IDriveService } from 'Interfaces/IDriveService'
import * as system from 'System/index'

export interface IProviderInfo
{
    providerId: string
    endpoint: string
    clientId: string
    scopes: string
    authCallbackPath: string
    redirectUri: string
    requireHttps?: boolean
}

export interface IAuthService
{
    loggedIn: boolean
    userId: string
    token: string
    login(isSilent?: boolean): Promise<boolean>
    logout(fullLogout?: boolean)
    onUserLoggedIn: system.ILiteEvent<void>
}

export interface IStorageProvider
{
    id: string,
    name: string,
    authService: IAuthService,
    driveService: IDriveService,
    syncSupport: boolean
}