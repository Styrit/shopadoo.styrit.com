export interface IDriveService {
    hasBackup: boolean
    lastBackupDate: string

    getChanges(): Promise<IDriveItem[]>

    downloadFile(fileName: string, format: 'string' | 'json'): Promise<any>

    uploadFile(fileName: string, content: string | object): Promise<IDriveItem>

    deleteFile(fileName: string): Promise<void>

    checkBackup()

    // downloadFileMetadata(fileName: string): Promise<OneDriveItem>

    search(term: string): Promise<IDriveItem[]>

    getChildren(): Promise<IDriveItem[]>

    getPermissions(fileName: string): Promise<IDrivePermission[]>

    getShareLink(fileName: string): Promise<string>

    removeShareLink(fileName: string, permissionId: string): Promise<void>

    downloadSharedFileMetadata(surl: string): Promise<IDriveItem>

    downloadSharedFile(surl: string, format: 'string' | 'json'): Promise<any>

    uploadSharedFile(surl: string, content: string): Promise<void>

}

export interface IDriveItem {
    id: string
    /**
     * File Name including the extension
     */
    name: string
    content: any
    /**
     * An eTag for the content of the item. This eTag is not changed if only the metadata is changed. Note This property is not returned if the Item is a folder. Read-only.
     */
    contentTag: string
    file: any
    deleted: any
    lastModified: Date
    userId: string
    userName: string
}

export interface IDrivePermission {
    id: string
    roles: string[]
    link: any
    shareId: string
}