import { ToDoItem, IToDoItem } from 'Models/ToDoItem'
import * as system from 'System/index'

export interface IGroup
{
    id: string
    name: string

}

export class Group
{
    id: string
    name: string
    items: Array<ToDoItem>

    constructor(id?: string, name?: string, items?: Array<ToDoItem>)
    {
        this.id = id || new system.Guid().toString()
        this.name = name || ''
        this.items = items || new Array<ToDoItem>()
    }
}
