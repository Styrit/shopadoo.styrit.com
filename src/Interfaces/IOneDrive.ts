export interface IApplication
{
    id: string
}

export interface IUser
{
    displayName: string
    id: string
}

export interface ICreatedBy
{
    application: IApplication
    user: IUser
    // https://dev.onedrive.com/resources/thumbnailSet.htm
    thumbnails: any
}

export interface ILastModifiedBy
{
    application: IApplication
    user: IUser
}

export interface IParentReference
{
    driveId: string
    id: string
}
export interface IFileSystemInfo
{
    createdDateTime: Date
    lastModifiedDateTime: Date
}

export interface IFolder
{
    childCount: number
}

export interface IHashes
{
    crc32Hash: string
    sha1Hash: string
}
export interface IFile
{
    hashes: IHashes
    mimeType: string
}

export interface IShared
{
    owner: { user: IUser }
    scope: 'anonymous' | 'organization' | 'users',
}

export interface ISharedItem
{
    '@odata.context': string
    '@content.downloadUrl': string
    createdBy: ICreatedBy
    createdDateTime: Date
    cTag: string
    eTag: string
    id: string
    lastModifiedBy: ILastModifiedBy
    lastModifiedDateTime: Date
    name: string
    size: number
    webUrl: string
    file: IFile
    fileSystemInfo: IFileSystemInfo
    shared: IShared
}

export interface IOneDriveItem
{
    //// https://dev.onedrive.com/resources/item.htm#

    id: string
    name: string
    eTag: string
    cTag: string
    createdBy: ICreatedBy
    createdDateTime: string
    lastModifiedBy: ILastModifiedBy
    lastModifiedDateTime: string
    size: number
    webUrl: string
    webDavUrl: string
    description: string
    parentReference: IParentReference
    folder: IFolder
    file: IFile
    fileSystemInfo: IFileSystemInfo
    image: any
    photo: any
    audio: any
    video: any
    location: Location
    remoteItem: any
    searchResult: any
    deleted: any
    specialFolder: any
    shared: IShared
    sharepointIds: any
    children: IOneDriveItem[]
    thumbnails: any[]
    name_conflictBehavior: string
    content_downloadUrl: string
    content_sourceUrl: string
    content: any
}

export interface IDelta
{
    value: IOneDriveItem[]
    '@odata.nextLink': string
    '@delta.token': string
}

export interface IOneDriveInnererror
{
    errorType: string;
    debugMessage: string;
    stackTrace: string;
    throwSite: string;
    code: string;
}

export interface IOneDriveError
{
    code: string;
    message: string;
    innererror: IOneDriveInnererror;
}

export interface IOneDriveLink
{
    application: IApplication;
    type: string;
    webUrl: string;
}

//// https://dev.onedrive.com/items/search.htm
export interface ISearchResult
{
    '@odata.context': string
    '@search.approximateCount': number
    value: IOneDriveItem[]
    '@odata.nextLink': string
}