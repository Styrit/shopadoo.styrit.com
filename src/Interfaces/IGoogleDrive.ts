
export interface IGoogleDriveItem
{
    kind: 'drive#file'
    id: string
    name: string
    mimeType: string
    description: string
    starred: boolean
    trashed: boolean
    explicitlyTrashed: boolean
    parents: [
        string
    ]
    properties: {
        (key): string
    }
    appProperties: {
        (key): string
    }
    spaces: [
        string
    ]
    version: number
    webContentLink: string
    webViewLink: string
    iconLink: string
    thumbnailLink: string
    viewedByMe: boolean
    viewedByMeTime: string
    createdTime: string
    modifiedTime: string
    modifiedByMeTime: string
    sharedWithMeTime: string
    sharingUser: {
        kind: 'drive#user'
        displayName: string
        photoLink: string
        me: boolean
        permissionId: string
        emailAddress: string
    }
    owners: [
        {
            kind: 'drive#user'
            displayName: string
            photoLink: string
            me: boolean
            permissionId: string
            emailAddress: string
        }
    ]
    lastModifyingUser: {
        kind: 'drive#user'
        displayName: string
        photoLink: string
        me: boolean
        permissionId: string
        emailAddress: string
    }
    shared: boolean
    ownedByMe: boolean
    capabilities: {
        canEdit: boolean
        canComment: boolean
        canShare: boolean
        canCopy: boolean
        canReadRevisions: boolean
    }
    viewersCanCopyContent: boolean
    writersCanShare: boolean
    permissions: [any]
    folderColorRgb: string
    originalFilename: string
    fullFileExtension: string
    fileExtension: string
    md5Checksum: string
    size: number
    quotaBytesUsed: number
    headRevisionId: string
    contentHints: {
        thumbnail: {
            image: any
            mimeType: string
        }
        indexableText: string
    }
    imageMediaMetadata: {
        width: number
        height: number
        rotation: number
        location: {
            latitude: number
            numberitude: number
            altitude: number
        }
        time: string
        cameraMake: string
        cameraModel: string
        exposureTime: number
        aperture: number
        flashUsed: boolean
        focalLength: number
        isoSpeed: number
        meteringMode: string
        sensor: string
        exposureMode: string
        colorSpace: string
        whiteBalance: string
        exposureBias: number
        maxApertureValue: number
        subjectDistance: number
        lens: string
    }
    videoMediaMetadata: {
        width: number
        height: number
        durationMillis: number
    }
    isAppAuthorized: boolean
}