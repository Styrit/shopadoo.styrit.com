import { ToDoItem } from 'Models/ToDoItem'

export class HistoryService {
    itemHistory = new Array<string>()

    constructor() {
    }

    addItem(item: ToDoItem, oldItemName?: string) {
        if (oldItemName) {
            let existingOldItemIndex = this.itemHistory.findIndex(i => i.toLowerCase() == oldItemName.toLowerCase())
            if (existingOldItemIndex > -1)
                this.itemHistory.splice(existingOldItemIndex, 1)
        }

        if (item && item.name) {
            let existingItemIndex = this.itemHistory.findIndex(i => i.toLowerCase() == item.name.toLowerCase())
            if (existingItemIndex > -1)
                this.itemHistory.splice(existingItemIndex, 1)

            this.itemHistory.unshift(item.name)
        }
    }
}