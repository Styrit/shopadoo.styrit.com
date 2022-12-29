import { IDriveItem } from 'Interfaces/IDriveService'
import * as GoogleDrive from 'Interfaces/IGoogleDrive'
import * as OneDrive from 'Interfaces/IOneDrive'

export class DriveItem implements IDriveItem
{
    id: string
    name: string
    content: any
    contentTag: string
    file: any
    deleted: any
    lastModified: Date
    userId: string
    userName: string

    constructor(item: GoogleDrive.IGoogleDriveItem | OneDrive.IOneDriveItem)
    {
        this.map(item)
    }

    private map(item)
    {
        if (item.lastModifiedDateTime)
        {
            //// the web response of an single item and a diff collection provide a different object structure
            //// https://dev.onedrive.com/resources/item.htm#
            this.mapOneDriveItem(item)
        }
        else if (item.createdTime)
        {
            this.mapGoogleDriveItem(item)
        }
        else
        {
            console.error('Mapping to OneDriveItem not supported. Object to map >>')
            console.log(item)
        }
    }

    private mapOneDriveItem(item: OneDrive.IOneDriveItem)
    {
        this.id = item.id
        this.name = item.name
        this.lastModified = new Date(item.lastModifiedDateTime)
        this.file = item.file
        this.deleted = item.deleted
        this.contentTag = item.eTag

        if (item.shared && item.shared.owner && item.shared.owner.user)
        {
            this.userId = item.shared.owner.user.id
            this.userName = item.shared.owner.user.displayName
        }
    }

    private mapGoogleDriveItem(item: GoogleDrive.IGoogleDriveItem)
    {
        this.id = item.id
        this.name = item.name
        this.lastModified = new Date(item.modifiedTime)

        // TODO: implemented well                
    }
}