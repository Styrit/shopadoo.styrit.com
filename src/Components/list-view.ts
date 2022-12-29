import { autoinject, bindable, Animator, TaskQueue } from 'aurelia-framework'
import { EventAggregator } from 'aurelia-event-aggregator'

// import Sortable from 'sortablejs'
// Core SortableJS (without default plugins)
import Sortable from 'sortablejs/modular/sortable.core.esm.js';

export interface ListViewItem
{
    selected: boolean
}

export interface ListViewGroup
{
    items: Array<ListViewItem>
}

@autoinject
export class ListView
{
    /** Gets or sets the data source that provides the ListView with items. */
    @bindable items: Array<ListViewItem>

    /** Gets or sets the groups */
    @bindable itemsGrouped: Array<ListViewGroup>

    /** Gets or sets a value that specifies whether items can be dragged. */
    @bindable itemsDraggable: boolean

    /** Gets or sets an object that indicates which item should have keyboard focus and the focus state of that item. */
    @bindable currentItem: ListViewItem

    /** Gets or sets a value that specifies how many ListView items can be selected. */
    @bindable selectionMode: boolean

    /** Gets or sets how the ListView reacts when the user taps or clicks an item. */
    // https://msdn.microsoft.com/en-us/library/windows/apps/hh701303.aspx
    //? @bindable tapBehavior: 'none' | 'directSelect' | 'toggleSelect' | 'invokeOnly'

    private loaded: boolean

    private sortablejs = new Array<Sortable>()
    private sortableOptions = {
        animation: 150,
        group: 'list',

        //// fallback option not necessary for IE and Edge here
        // forceFallback: true,

        onUpdate: event =>
        {
            if (event.newIndex != event.oldIndex)
            {
                console.log('new/old index', event.newIndex, event.oldIndex)

                if (this.itemsGrouped)
                {
                    let fromList = event.from as Element
                    let listIndex = Number(fromList.id.substring(6))
                    this.itemsGrouped[listIndex].items.splice(event.newIndex, 0,
                        this.itemsGrouped[listIndex].items.splice(event.oldIndex, 1)[0])
                }
                else
                {
                    this.items.splice(event.newIndex, 0, this.items.splice(event.oldIndex, 1)[0])
                }
            }
        },
        onAdd: event =>
        {
            let fromList = event.from as Element
            let fromIndex = Number(fromList.id.substring(6))

            let toList = event.to as Element
            let toIndex = Number(toList.id.substring(6))

            this.itemsGrouped[toIndex].items.splice(event.newIndex, 0,
                this.itemsGrouped[fromIndex].items.splice(event.oldIndex, 1)[0])
        }
    }

    constructor(private taskQueue: TaskQueue, private eventAggregator: EventAggregator, private animator: Animator, private element: Element)
    {
    }

    private created()
    {
    }

    private attached()
    {
        this.taskQueue.queueTask(() =>
        {
            this.loaded = true
        })
    }

    public detached()
    {
        this.destroySortablejs()
    }

    private destroySortablejs()
    {
        if (this.sortablejs.length)
            for (let sortjs of this.sortablejs)
            {
                try
                {
                    sortjs.destroy()
                }
                catch (error)
                {
                    // sortablejs error, do nothing here
                }
            }
    }

    private select(item: ListViewItem)
    {
        if (this.selectionMode)
            item.selected = !item.selected

        this.currentItem = item
    }

    private selectionModeChanged(newValue: boolean, oldValue: boolean)
    {
        if (newValue)
        {
            if (this.items)
            {
                this.items.forEach(item =>
                {
                    if (item.selected)
                        item.selected = false
                })
            }
            if (this.itemsGrouped)
            {
                this.itemsGrouped.forEach(group =>
                {
                    group.items.forEach(item =>
                    {
                        if (item.selected)
                            item.selected = false
                    })
                })
            }
        }
    }

    private itemsDraggableChanged(newValue: boolean, oldValue: boolean)
    {
        if (newValue)
        {
            let lists = document.querySelectorAll('ul.list')

            for (let i = 0; i < lists.length; i++)
            {
                this.sortablejs.push(new Sortable(lists[i], this.sortableOptions))
            }
        }
        else
        {
            this.destroySortablejs()
        }
    }
}