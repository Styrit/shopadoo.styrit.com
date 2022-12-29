import { ToDoItem } from 'Models/ToDoItem'
import { SortType } from 'Models/Enums'

export class ToDoItemComparer
{
    compare: (left: ToDoItem, right: ToDoItem, activeItemsFirst: boolean) => number

    constructor(sortType: SortType)
    {
        switch (sortType)
        {
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

    private getNameComparer(left: ToDoItem, right: ToDoItem, activeItemsFirst = false): number
    {
        if (activeItemsFirst)
        {
            if (left.done && !right.done)
                return 1;
            if (!left.done && right.done)
                return -1;

            // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/localeCompare
            return left.name.localeCompare(right.name, undefined, { numeric: true, sensitivity: 'base' });
        }
        else
        {
            return left.name.localeCompare(right.name, undefined, { numeric: true, sensitivity: 'base' });
        }
    }

    private getUsageComparer(left: ToDoItem, right: ToDoItem, activeItemsFirst = false): number
    {
        if (activeItemsFirst)
        {
            if (left.done && !right.done)
                return 1;
            if (!left.done && right.done)
                return -1;

            return -1 * left.usage.localeCompare(right.usage);
        }
        else
        {
            return -1 * left.usage.localeCompare(right.usage);
        }
    }

    private getDateCreatedComparer(left: ToDoItem, right: ToDoItem, activeItemsFirst = false): number
    {
        if (activeItemsFirst)
        {
            if (left.done && !right.done)
                return 1;
            if (!left.done && right.done)
                return -1;

            return right.created.localeCompare(left.created);
        }
        else
        {
            return right.created.localeCompare(left.created);
        }
    }
}

export class Comparer
{
    static searchTermCompare(left: string, right: string, term: string): number
    {
        if (left.startsWith(term) && !right.startsWith(term))
            return -1
        if (right.startsWith(term) && !left.startsWith(term))
            return 1

        return left.localeCompare(right)
    }
}
