import { Container } from 'aurelia-framework'
import { EventAggregator } from 'aurelia-event-aggregator'
import { Group, IGroup } from 'Models/Group'
import { ToDoList } from 'Models/ToDoList'
import * as system from 'System/index'

export interface IToDoItem {
    id: string
    name: string
    groupId: string
    done: boolean
    usage: number
    created: string
    modified: string

}

export class ToDoItem {
    eventAggregator: EventAggregator

    id: string

    private _name: string
    public get name(): string {
        return this._name
    }
    public set name(v: string) {
        this._name = v
        if (this.toDoList && this.modified) {
            this.modified = new Date()
            this.toDoList.hasUserChanges = true
            this.eventAggregator.publish('ToDoItemChanged', this)
        }
    }

    private _done: boolean
    public get done(): boolean {
        return this._done
    }
    public set done(v: boolean) {
        this._done = v
        if (this.modified && !v && this.modified.addDays(1) < new Date())
            this.usage++

        if (this.toDoList && this.modified) {
            this.modified = new Date()
            this.toDoList.hasUserChanges = true
            this.eventAggregator.publish('ToDoItemChanged', this)
        }
    }

    usage: number
    created: Date
    modified: Date

    //// only for multi-selection on the list-view
    selected: boolean

    toDoList: ToDoList

    constructor(toDoList?: ToDoList, name = '', doBaseInitialization = true) {
        this.eventAggregator = Container.instance.get(EventAggregator)

        this.toDoList = toDoList
        this.name = name

        if (doBaseInitialization) {
            this.id = new system.Guid().toString()
            this.name = name
            this.done = false
            this.usage = 0
            this.created = new Date()
            this.modified = new Date()
        }
    }

    static map(toDoList: ToDoList, item: IToDoItem): ToDoItem {
        const toDo = new ToDoItem(toDoList, item.name, false)
        toDo.id = item.id
        toDo.done = item.done
        toDo.usage = item.usage
        toDo.created = new Date(item.created)
        toDo.modified = new Date(item.modified)
        return toDo
    }
}
