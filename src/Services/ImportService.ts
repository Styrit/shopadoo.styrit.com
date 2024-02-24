import { autoinject, LogManager } from 'aurelia-framework'
import { Logger } from 'aurelia-logging'

import * as system from 'System/index'
import { OneDriveService } from 'Services/OneDriveService'
import { SettingsService } from 'Services/SettingsService'
import { IAuthService } from 'Interfaces/IAuthService'
import { IGroup } from 'Models/Group'
import { IToDoItem } from 'Models/ToDoItem'
import { IToDoList } from 'Models/ToDoList'
import { SortType } from 'Models/Enums'

export interface IShoppingListItem {
    Id: string
    Name: string
    IsChecked: string
    Usage: string
    GroupId: string
    Created: string
    Modified: string
}

export interface ICategoryGroup {
    Id: string
    Name: string
}

export interface IItems {
    ShoppingListItem: IShoppingListItem[]
}

export interface ICategoryGroups {
    Group: ICategoryGroup[]
}

export interface ICategory {
    Id: string
    Name: string
    ShowItemsOnMainTile: string
    Color: string
    ItemListViewMode: string
    ShowActiveItemsFirst: string
    SortType: string
    IsAutomaticSortingChecked: string
    Groups: ICategoryGroups
    Items: IItems
}

@autoinject
export class ImportService {
    private logger: Logger = LogManager.getLogger('ImportService')

    constructor(private settingsService: SettingsService) {
    }

    getStyritShoppingListData(): Promise<IToDoList[]> {
        let url = `https://api.onedrive.com/v1.0/drive/root:/ProgramData/Styrit/StyritShoppingList/data.xml:/content?access_token=${this.settingsService.storageProvider.authService.token}`

        return new Promise<IToDoList[]>((resolve, reject) => {
            fetch(url)
                .then(response => response.text())
                .then(str => (new window.DOMParser()).parseFromString(str, "text/xml"))
                .then((d) => {
                    let lists = new Array<IToDoList>()
                    let categories = d.getElementsByTagName('Category')
                    for (let key in categories) {
                        if (categories.hasOwnProperty(key)) {
                            let element = categories[key]
                            let category = xml2json(element) as ICategory
                            lists.push(this.mapList(category))
                        }
                    }
                    resolve(lists)
                })
                .catch(error => {
                    this.logger.warn('getStyritShoppingListData error: ', error)
                    reject(error)
                })
        })
    }

    mapList(category: ICategory): IToDoList {
        let items = new Array<IToDoItem>()
        if (category.Items.ShoppingListItem) {
            if (category.Items.ShoppingListItem.length)
                items = category.Items.ShoppingListItem.map(d => this.mapItem(d))
            else {
                // if only one result is in the list, xml2json parse it as an object
                items.push(this.mapItem(category.Items.ShoppingListItem as any))
            }
        }

        let groups = new Array<IGroup>()
        if (category.Groups.Group) {
            if (category.Groups.Group.length) {
                groups = category.Groups.Group.map(d => {
                    return { id: d.Id, name: d.Name }
                })
            }
            else {
                let group: ICategoryGroup = category.Groups.Group as any
                groups.push({ id: group.Id, name: group.Name })
            }
        }

        let list: IToDoList = {
            name: category.Name,
            id: new system.Guid().toString(),
            items: items,
            showActiveItemsFirst: category.ShowActiveItemsFirst == 'true',
            color: undefined,
            groups: groups,
            // todo: set sortType properly
            sortType: this.mapSortType(Number(category.SortType)),
            shared: undefined,
            hasUserChanges: false,
            created: new Date().toJSON(),
            modified: new Date().toJSON()
        }

        return list
    }

    mapItem(categoryItem: IShoppingListItem): IToDoItem {
        let item: IToDoItem = {
            id: categoryItem.Id,
            name: categoryItem.Name,
            done: categoryItem.IsChecked == 'true',
            groupId: categoryItem.GroupId,
            usage: Number(categoryItem.Usage),
            created: categoryItem.Created,
            modified: categoryItem.Modified,
        }
        return item
    }

    private mapSortType(oldSortType: number): SortType {
        let sortType = SortType.Alphabetical
        switch (oldSortType) {
            case 3:
                sortType = SortType.DateCreated
                break
            case 5:
                sortType = SortType.Manual
                break
            case 6:
                sortType = SortType.Usage
                break
        }
        return sortType
    }
}

function xml2json(xml) {
    try {
        let obj = {}
        if (xml.childElementCount > 0) {
            for (let i = 0; i < xml.childNodes.length; i++) {
                let item = xml.childNodes[i]
                if (item.nodeType !== 1)
                    continue

                let nodeName = item.nodeName
                if (typeof (obj[nodeName]) == 'undefined') {
                    obj[nodeName] = xml2json(item)
                } else {
                    if (typeof (obj[nodeName].push) == 'undefined') {
                        let old = obj[nodeName]
                        obj[nodeName] = []
                        obj[nodeName].push(old)
                    }
                    obj[nodeName].push(xml2json(item))
                }
            }
        } else {
            obj = xml.textContent
        }
        return obj
    } catch (e) {
        console.error(e.message)
    }
}