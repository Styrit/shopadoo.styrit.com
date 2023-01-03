import { ToDoItem } from 'Models/ToDoItem'
import { SortType } from 'Models/Enums'

export class ToDoItemComparer {
    compare: (left: ToDoItem, right: ToDoItem, activeItemsFirst: boolean) => number

    constructor(sortType: SortType) {
        switch (sortType) {
            case SortType.Alphabetical:
                this.compare = this.getNameComparer
                break
            case SortType.Usage:
                this.compare = this.getUsageComparer
                break
            case SortType.DateCreated:
                this.compare = this.getDateCreatedComparer
                break
        }
    }

    private getNameComparer(left: ToDoItem, right: ToDoItem, activeItemsFirst = false): number {
        if (activeItemsFirst) {
            if (left.done && !right.done)
                return 1;
            if (!left.done && right.done)
                return -1;

            // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/localeCompare
            return left.name.localeCompare(right.name, undefined, { numeric: true, sensitivity: 'base' });
        }
        else {
            return left.name.localeCompare(right.name, undefined, { numeric: true, sensitivity: 'base' });
        }
    }

    private getUsageComparer(left: ToDoItem, right: ToDoItem, activeItemsFirst = false): number {
        // we sort by year, weeknumber, and usage
        const leftSortKey = left.modified.getFullYear() + '-' + getWeekNumber(left.modified) + '-' + left.usage
        const rightSortKey = right.modified.getFullYear() + '-' + getWeekNumber(right.modified) + '-' + right.usage

        if (activeItemsFirst) {
            if (left.done && !right.done)
                return 1;
            if (!left.done && right.done)
                return -1;
        }
        return -1 * leftSortKey.localeCompare(rightSortKey);
    }

    private getDateCreatedComparer(left: ToDoItem, right: ToDoItem, activeItemsFirst = false): number {
        if (activeItemsFirst) {
            if (left.done && !right.done)
                return 1;
            if (!left.done && right.done)
                return -1;

            return right.created.localeCompare(left.created);
        }
        else {
            return right.created.localeCompare(left.created);
        }
    }
}

export class Comparer {
    static searchTermCompare(left: string, right: string, term: string): number {
        if (left.startsWith(term) && !right.startsWith(term))
            return -1
        if (right.startsWith(term) && !left.startsWith(term))
            return 1

        return left.localeCompare(right)
    }
}


function getWeekNumber(d) {
    // Copy date so don't modify original
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    // Set to nearest Thursday: current date + 4 - current day number
    // Make Sunday's day number 7
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    // Get first day of year
    var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    // Calculate full weeks to nearest Thursday
    var weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    // Return array of year and week number
    return weekNo
}