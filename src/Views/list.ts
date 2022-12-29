import { autoinject, TaskQueue, Animator } from 'aurelia-framework'
import { Router, RouteConfig, NavigationInstruction, RedirectToRoute } from 'aurelia-router'
import basicContext from 'basiccontext'

import { StorageService } from 'Services/StorageService'
import { ListService } from 'Services/ListService'
import { UIHelper } from 'Helper/UIHelper'
import { ToDoItemComparer } from 'Helper/Comparer'
import { ToDoItem } from 'Models/ToDoItem'
import { ToDoList } from 'Models/ToDoList'
import { SortType } from 'Models/Enums'
import { AppService } from 'Services/AppService'
import { SettingsService } from 'Services/SettingsService'
import { ListViewItem } from 'Components/list-view'



@autoinject
export class ListViewModel
{
    list: ToDoList

    itemsDraggable: boolean
    selectionMode: boolean

    defaultAppBarOpen: boolean
    selectionAppBarOpen: boolean

    canScrollToTop: boolean

    sortTypeEnum = SortType // used at the view

    constructor(
        private settingsService: SettingsService,
        private appService: AppService,
        private listService: ListService,
        private storageService: StorageService,
        private taskQueue: TaskQueue,
        private router: Router,
        private animator: Animator
    ) { }

    private canActivate(params: any, routeConfig: RouteConfig, navigationInstruction: NavigationInstruction)
    {
        return new Promise<boolean>((resolve, reject) =>
        {
            this.storageService.executeOnListsLoaded(() =>
            {
                this.taskQueue.queueTask(() =>
                {
                    this.list = !!params.id ? this.listService.myLists.find(d => d.id == params.id) : undefined
                    if (this.list)
                    {
                        resolve(true)
                    }
                    else
                    {
                        reject(new RedirectToRoute('MyLists'))
                    }
                })
            })
        })
    }

    private activate(params: any, routeConfig: RouteConfig, navigationInstruction: NavigationInstruction)
    {
        if (this.list)
        {
            // this.list.onUpdate.on(this.adjustControls)
            routeConfig.navModel.setTitle(this.list.name)
            this.appService.setStatusBarBackgroundColor(this.settingsService.getHexColorFromKey(this.list.color))
        }
    }

    private attached()
    {
        let listViewContainer = document.querySelector('list-view').parentElement as HTMLElement
        listViewContainer.onscroll = (ev) =>
        {
            this.canScrollToTop = (ev.currentTarget as Element).scrollTop > 600
        }
    }

    private detached()
    {
        // if (this.list)
        //     this.list.onUpdate.off(this.adjustControls)
    }

    defaultAppBarClick(cmd: string)
    {
        switch (cmd)
        {
            case 'scrollUp':
                let listViewContainer = document.querySelector('list-view').parentElement as Element
                listViewContainer.scrollTop = 0
                break

            case 'sort':
                if (this.list.sortType == SortType.Manual)
                {
                    this.itemsDraggable = !this.itemsDraggable
                }
                else
                {
                    this.list.sortItems()
                    //// do animation
                    // this.animator.enter(document.querySelector('list-view ul') as HTMLElement)
                }
                break

            case 'add':
                this.router.navigateToRoute('ItemAdd', { listId: this.list.id })
                break

            case 'sendTo':
                this.list.share()
                this.defaultAppBarOpen = false
                break

            case 'selectionMode':
                this.selectionMode = true
                break

            case 'editList':
                this.router.navigateToRoute('ListEdit', { id: this.list.id })
                break
        }
    }

    selectionAppBarClick(cmd: string)
    {
        let selectedItems: ToDoItem[]
        switch (cmd)
        {
            case 'cancel':
                this.selectionMode = false
                break

            case 'delete':
                selectedItems = this.list.getItems().filter(item => (item as ListViewItem).selected)
                selectedItems.forEach(item =>
                {
                    this.list.deleteItem(item)
                })
                this.selectionMode = false
                break

            case 'done':
                selectedItems = this.list.getItems().filter(item => (item as ListViewItem).selected)
                selectedItems.forEach(item =>
                {
                    item.done = true
                })
                this.selectionMode = false
                break

            case 'redo':
                selectedItems = this.list.getItems().filter(item => (item as ListViewItem).selected)
                selectedItems.forEach(item =>
                {
                    item.done = false
                })
                this.selectionMode = false
                break

            case 'selectInactive':
                this.list.getItems().forEach(item =>
                {
                    if (item.done)
                        (item as ListViewItem).selected = true
                    else
                        (item as ListViewItem).selected = false
                })
                this.selectionAppBarOpen = false
                break

            case 'selectAll':
                this.list.getItems().forEach(item =>
                {
                    (item as ListViewItem).selected = true
                })
                this.selectionAppBarOpen = false
                break
        }
    }

    onItemClick(item: ToDoItem)
    {
        item.done = !item.done
    }

    onItemContextmenu(item: ToDoItem, event: Event)
    {
        this.showContextMenu(item, event)
    }

    private showContextMenu(item: ToDoItem, event: Event)
    {        
        let htmlItem = (event.target as HTMLElement).closest('.list-item-template') as HTMLElement
        if (htmlItem)
        {
            // Highlight item as selected
            htmlItem.classList.add('has-menu')

            let items = [
                {
                    title: 'Edit', icon: 'icon icon-edit', fn: () =>
                    {
                        this.router.navigateToRoute('ItemEdit', { listId: this.list.id, id: item.id })
                    }
                },
                {
                    title: 'Delete', icon: 'icon icon-delete', fn: () =>
                    {
                        this.list.deleteItem(item)
                    }
                }
            ]

            basicContext.show(items, event, () =>
            {
                basicContext.close(event)
                htmlItem.classList.remove('has-menu')
            })
        }
        else
        {
            console.error('html item not found')
        }
    }
}