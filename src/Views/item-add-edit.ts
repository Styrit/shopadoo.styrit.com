import { autoinject, TaskQueue } from 'aurelia-framework'
import { Router } from 'aurelia-router'
import { inject } from 'aurelia-framework'

import { ListService } from 'Services/ListService'
import { ToDoItem } from 'Models/ToDoItem'
import { ToDoList } from 'Models/ToDoList'
import { Group } from 'Models/Group'
import { ToDoItemComparer, Comparer } from 'Helper/Comparer'
import { AddedItemInfoType } from 'Models/Enums'
import { HistoryService } from 'Services/HistoryService'
import { StorageService } from 'Services/StorageService'
import autoComplete from 'pixabay-auto-complete'

@autoinject
export class ItemAddEditViewModel {
    readonly addedStatusTruncateCount = 30

    selectedList: ToDoList
    selectedGroup: Group
    oldSelectedGroup: Group
    toDoItem: ToDoItem
    oldToDoItemName: string
    isInEditMode: boolean = false
    autoCompleteBox: autoComplete
    addedStatus: string

    constructor(
        private router: Router,
        private listService: ListService,
        private historyService: HistoryService,
        private storageService: StorageService,
        private taskQueue: TaskQueue) {
        this.router = router
    }

    private activate(params, routeConfig, navigationInstruction) {
        this.selectedList = this.listService.myLists.filter(d => d.id == params.listId)[0]
        this.toDoItem = new ToDoItem()
        // System.Assert.IsNotNull(this.selectedList)

        if (params.id) {
            console.log('param id: ' + params.id)
            this.toDoItem = this.selectedList.getItems().find(d => d.id == params.id)
            this.oldSelectedGroup = this.selectedList.getGroup(this.toDoItem)
            this.selectedGroup = this.oldSelectedGroup
            this.oldToDoItemName = this.toDoItem.name
            this.isInEditMode = true
            // System.Assert.IsNotNull(this.toDoItem)
        }
    }

    private attached() {
        this.taskQueue.queueTask(this.processUI)
        this.taskQueue.queueTask(() => {
            if (!this.storageService.historyLoaded)
                this.storageService.loadHistory()
        })
    }

    private detached() {
        if (this.isInEditMode) {
            this.toDoItem.name = this.toDoItem.name.trim()

            if (this.toDoItem.name) {
                //// handle group change
                if (this.oldSelectedGroup != this.selectedGroup) {
                    this.oldSelectedGroup.items.delete(this.toDoItem)
                    this.selectedGroup.items.push(this.toDoItem)
                }
            }

            if (this.toDoItem.name != this.oldToDoItemName)
                this.historyService.addItem(this.toDoItem, this.oldToDoItemName)

            if (!this.toDoItem.name) {
                this.selectedList.deleteItem(this.toDoItem)
                console.log('item deleted')
            }
        }

        // sort list
        this.selectedList.sortItems(true)

        // dispose ui
        if (this.autoCompleteBox)
            this.autoCompleteBox.destroy()
    }

    appBarSave() {
        if (this.selectedList.addItem(this.toDoItem, this.selectedGroup) == AddedItemInfoType.Added)
            this.historyService.addItem(this.toDoItem)
        this.router.navigateBack()
    }

    private processUI = () => {
        let input = document.querySelector('#autoSuggestBox') as HTMLInputElement
        input.focus()
        input.selectionStart = input.value.length

        if (!this.isInEditMode) {
            // https://goodies.pixabay.com/javascript/auto-complete/demo.html
            this.autoCompleteBox = new autoComplete({
                selector: input,
                minChars: 2,
                offsetTop: 0,
                cache: false,
                source: (term, suggest) => {
                    let source = this.historyService.itemHistory.concat(this.selectedList.getItems().map(i => i.name))
                    let queryText = term.toLowerCase()
                    let matches = new Array<string>()

                    if (queryText.length > 2) {
                        matches = source.filter(d => d.toLowerCase().contains(queryText))
                    }
                    else if (queryText.length == 2) {
                        matches = source.filter(d => d.toLowerCase().startsWith(queryText))
                    }

                    // get unique values
                    // http://stackoverflow.com/questions/11246758/how-to-get-unique-values-in-an-array
                    matches = matches.filter((x, i, a) => a.indexOf(x) == i)

                    // sort items
                    if (queryText.length > 2)
                        matches.sort((left, right) => Comparer.searchTermCompare(left.toLowerCase(), right.toLowerCase(), queryText))
                    else
                        matches.sort()

                    suggest(matches)
                },
                onSelect: (event: string, term: string, item) => {
                    this.toDoItem.name = term
                    // alternative: 
                    // https://www.danyow.net/jquery-ui-datepicker-with-aurelia/
                }
            })
        }

        input.onkeydown = (event) => {
            console.log('Keydown keyCode: ' + event.key)
            if (["NumpadEnter", "Enter"].includes(event.key)) {
                if (this.isInEditMode) {
                    this.router.navigateBack()
                }
                else {
                    // let selectedGroup = this.toDoItem.groupId
                    let addedType = this.selectedList.addItem(this.toDoItem, this.selectedGroup)

                    console.log('Item added: ' + this.toDoItem.name)

                    switch (addedType) {
                        case AddedItemInfoType.Added:
                            this.addedStatus = `'${this.toDoItem.name.truncate(this.addedStatusTruncateCount)}' added`
                            this.historyService.addItem(this.toDoItem)
                            break
                        case AddedItemInfoType.Activated:
                            this.addedStatus = `'${this.toDoItem.name.truncate(this.addedStatusTruncateCount)}' activated`
                            break
                        case AddedItemInfoType.AddedMultiple:
                            this.addedStatus = 'Multiple items added'
                            break
                        case AddedItemInfoType.Ignored:
                            this.addedStatus = `'${this.toDoItem.name.truncate(this.addedStatusTruncateCount)}' was already in list`
                            break
                        default:
                            this.addedStatus = ''
                            break
                    }

                    this.taskQueue.queueMicroTask(() => {
                        this.toDoItem = new ToDoItem()
                    })
                }

                event.preventDefault()
            }
        }

        if (!this.isInEditMode) {
            input.onpaste = (ev) => {
                console.log('onpaste')
                let text = ev.clipboardData.getData('Text')
                console.log('Clipboard: ' + text)

                let items = text.split('\n')
                if (items.length > 1) {
                    ev.preventDefault()
                    for (let item of items.reverse()) {
                        this.selectedList.addItem(new ToDoItem(this.selectedList, item), this.selectedGroup)
                    }
                    this.router.navigateBack()
                }
            }
        }
    }
}
