import { Container } from 'aurelia-framework'
import { EventAggregator } from 'aurelia-event-aggregator'
import { getLogger } from 'aurelia-logging'

import * as system from 'System/index'
import { ToDoItem, IToDoItem } from 'Models/ToDoItem'
import { Group, IGroup } from 'Models/Group'
import { SortType, AddedItemInfoType } from 'Models/Enums'
import { UIHelper } from 'Helper/UIHelper'
import { ToDoItemComparer } from 'Helper/Comparer'

export interface Share {
    url: string, userId: string, userName: string
}

export interface IToDoList {
    id: string
    name: string
    items: IToDoItem[]
    sortType: number
    color: string
    groups: Array<IGroup>
    showActiveItemsFirst: boolean
    shared: Share
    hasUserChanges: boolean
    created: string
    modified: string
}

const addSharedListWebUrl = 'http://shopadoo.styrit.com/#/ListAddShared/'
const indexOfOneDrive = '1drv.ms/'
const logger = getLogger('ToDoList')

export class ToDoList {
    static readonly fileExtension = '.list'

    eventAggregator: EventAggregator

    private onUpdateEvent = new system.LiteEvent<void>()
    public get onUpdate(): system.ILiteEvent<void> { return this.onUpdateEvent }

    id: string

    private _name: string
    public get name(): string {
        return this._name
    }
    public set name(v: string) {
        this._name = v
        if (this.modified) {
            this.modified = new Date()
            this.hasUserChanges = true
            this.eventAggregator.publish('ToDoListChanged', this)
        }
    }

    private _sortType: SortType
    public get sortType(): SortType {
        return this._sortType;
    }
    public set sortType(v: SortType) {
        this._sortType = v
        if (this.modified) {
            this.modified = new Date()
            this.hasUserChanges = true
            this.eventAggregator.publish('ToDoListChanged', this)
        }
    }

    private _showActiveItemsFirst: boolean;
    public get showActiveItemsFirst(): boolean {
        return this._showActiveItemsFirst
    }
    public set showActiveItemsFirst(v: boolean) {
        this._showActiveItemsFirst = v
        if (this.modified) {
            this.modified = new Date()
            this.hasUserChanges = true
            this.eventAggregator.publish('ToDoListChanged', this)
        }
    }

    private _color: string
    public get color(): string {
        return this._color
    }
    public set color(v: string) {
        this._color = v
        if (this.modified) {
            this.modified = new Date()
            this.hasUserChanges = true
            this.eventAggregator.publish('ToDoListChanged', this)
        }
    }

    private _defaultGroup = new Group('a77e08c6-f350-42e1-96cd-aa922688ac92', '#', new Array<ToDoItem>())
    get defaultGroup(): Group {
        return this._defaultGroup
    }

    groups: Array<Group>

    pinToStart: boolean
    shared: Share
    created: Date
    modified: Date
    //// only for synchronization
    hasUserChanges: boolean

    get fileName(): string {
        return this.id + ToDoList.fileExtension
    }

    get count(): number {
        return this.getItems().filter(d => !d.done).length
    }

    get sharedShopadooUrl(): string {
        let url = undefined

        if (this.shared && this.shared.url) {
            const indexOf = this.shared.url.indexOf(indexOfOneDrive)
            if (indexOf > 0) {
                url = addSharedListWebUrl + encodeURIComponent(this.shared.url.substring(indexOf + indexOfOneDrive.length))
            }
        }

        return url
    }

    constructor(name = '', doBaseInitialization = true) {
        this.eventAggregator = Container.instance.get(EventAggregator)

        this.name = name

        if (doBaseInitialization) {
            this.id = new system.Guid().toString()
            this.showActiveItemsFirst = true
            this.sortType = SortType.Alphabetical
            this.groups = new Array<Group>(this.defaultGroup)
            this.hasUserChanges = false
            this.created = new Date()
            this.modified = new Date()
        }
    }

    getItems(): ToDoItem[] {
        return [].concat(...this.groups.map<ToDoItem[]>(g => g.items))
    }

    getGroup(item: ToDoItem): Group {
        for (const group of this.groups) {
            if (group.items.find(d => d.id == item.id))
                return group
        }
    }

    getLatestModifiedDateWithItems(): Date {
        let modDate = this.modified
        this.getItems().forEach(d => {
            if (modDate < d.modified)
                modDate = d.modified
        })
        return modDate
    }

    static getLatestModifiedDateWithItems(list: IToDoList): Date {
        let modDate = new Date(list.modified)
        list.items.forEach(item => {
            const modified = new Date(item.modified)
            if (modDate < modified)
                modDate = modified
        })
        return modDate
    }

    static map(item: IToDoList): ToDoList {
        const list = new ToDoList(item.name, false)
        list.id = item.id
        list.groups = this.getGroups(list, item.groups, item.items)
        list.showActiveItemsFirst = item.showActiveItemsFirst
        list.sortType = item.sortType
        list.color = item.color
        list.shared = item.shared
        list.hasUserChanges = item.hasUserChanges
        list.created = new Date(item.created)
        list.modified = new Date(item.modified)
        return list
    }

    update(list: IToDoList) {
        // disable change tracking/event publishing by setting the modified date to undefined
        this.modified = undefined
        this.name = list.name
        this.showActiveItemsFirst = list.showActiveItemsFirst
        this.sortType = list.sortType

        this.defaultGroup.items.splice(0)
        this.groups.splice(0)
        this.groups.push(...ToDoList.getGroups(this, list.groups, list.items))

        this.shared = list.shared
        this.color = list.color
        this.hasUserChanges = false
        this.modified = new Date(list.modified)

        // TODO: update 'count' bindings - so far it works without triggering a change
        //; (<any>this).notify('count', this.items.filter(d => !d.done).length, (<any>this).getProperty('count'))

        this.onUpdateEvent.trigger()
        console.info('ToDoList updated: ' + this.name)
    }

    addItem(item: ToDoItem, group?: Group): AddedItemInfoType {
        item.toDoList = this

        let addedItemInfoType = AddedItemInfoType.Ignored

        item.name = item.name.trim()
        if (item.name.length == 0) {
            return AddedItemInfoType.Invalid
        }

        const gr = group ? group : this.defaultGroup
        const itemsInList = gr.items.filter(d => d.name.toLowerCase() == item.name.toLowerCase())
        if (itemsInList.length) {
            // should be only one item
            itemsInList.forEach(item => {
                if (item.done) {
                    item.done = false
                    addedItemInfoType = AddedItemInfoType.Activated
                }
                else {
                    addedItemInfoType = AddedItemInfoType.Ignored
                }
            })
        }
        else {
            gr.items.push(item)
            addedItemInfoType = AddedItemInfoType.Added

            this.modified = new Date()
            this.hasUserChanges = true
            this.eventAggregator.publish('ToDoListChanged', this)
        }

        return addedItemInfoType
    }

    deleteItem(item: ToDoItem) {
        for (const group of this.groups) {
            const index = group.items.indexOf(item)
            if (index > -1) {
                group.items.splice(index, 1)
                this.modified = new Date()
                this.hasUserChanges = true
                this.eventAggregator.publish('ToDoListChanged', this)
                break
            }
        }
    }

    /**
     * objectReset = false (workaround for the aurelia sorting bug)
     */
    sortItems(objectReset = false) {
        const comp = new ToDoItemComparer(this.sortType)
        if (comp.compare != null) {
            for (const group of this.groups) {
                //// Workaround for aurelia binding issue on sorting - https://github.com/aurelia/framework/issues/721
                if (objectReset)
                    group.items = new Array(...group.items.sort((left, right) => comp.compare(left, right, this.showActiveItemsFirst)))
                else
                    group.items.sort((left, right) => comp.compare(left, right, this.showActiveItemsFirst))
            }
        }
    }

    toPlainObject(): IToDoList {
        const items = new Array<IToDoItem>()
        const groups = new Array<IGroup>()

        for (const group of this.groups) {
            if (group != this.defaultGroup)
                groups.push({ id: group.id, name: group.name })

            group.items.forEach(iItem => {
                items.push({
                    id: iItem.id,
                    name: iItem.name,
                    groupId: group != this.defaultGroup ? group.id : undefined,
                    done: iItem.done,
                    usage: iItem.usage,
                    created: iItem.created.toJSON(),
                    modified: iItem.modified.toJSON()
                })
            })
        }

        const list: IToDoList = {
            name: this.name,
            id: this.id,
            items: items,
            showActiveItemsFirst: this.showActiveItemsFirst,
            sortType: this.sortType,
            color: this.color,
            groups: groups,
            // winjs add some binding properties here, so only save the needed values
            // shared: this.shared ? { url: this.shared.url, userId: this.shared.userId, userName: this.shared.userName } : undefined,
            // is it working now?:
            shared: this.shared,
            hasUserChanges: this.hasUserChanges,
            created: this.created.toJSON(),
            modified: this.modified.toJSON()
        }
        return list
    }

    share() {
        //// create the content
        const content = new Array<string>()
        for (const g of this.groups) {
            if (g.items.length) {
                if (this.groups.length > 1)
                    content.push('## ' + g.name)

                content.push(...g.items.filter(item => !item.done).map(item => item.name))
                content.push('') //// force new line
            }
        }

        const data = {
            title: this.name + ' | Shopadoo',
            description: 'Shopadoo list',
            content: content.join('\n')
        }

        if (navigator.share) {
            navigator.share({
                title: data.title,
                text: data.content
            })
                .catch((error) => logger.error('Error on sharing', error))
        }
        else {
            const email = ''
            const subject = encodeURIComponent(data.title)
            const emailBody = encodeURIComponent(data.content)
            const url = `mailto:${email}?subject=${subject}&body=${emailBody}`
            UIHelper.loadUrlInIframe(url)
        }
    }

    getHashCode(): string {
        const list = [this.name, this.sortType, this.showActiveItemsFirst, this.id].join(',')
        //// hash groups to?
        const listItems = this.getItems().map(i => [i.id, i.name, i.done].join(',')).join(' ')
        return (list + listItems).hashCode()
    }

    private static getGroups(list: ToDoList, groups: Array<IGroup>, items: Array<IToDoItem>): Array<Group> {
        const data = new Array<Group>()

        list.defaultGroup.items.push(...items.filter(item => !item.groupId).map(i => ToDoItem.map(list, i)))
        data.push(list.defaultGroup)

        if (groups) {
            for (const group of groups) {
                const g = new Group(group.id, group.name, new Array<ToDoItem>(...items.filter(item => item.groupId == group.id).map(i => ToDoItem.map(list, i))))
                data.push(g)
            }
        }

        return data
    }
}
