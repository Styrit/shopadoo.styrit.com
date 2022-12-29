import { autoinject } from 'aurelia-framework'

import { ToDoList, IToDoList } from 'Models/ToDoList'
import { ToDoItem, IToDoItem } from 'Models/ToDoItem'
import { Group } from 'Models/Group'
import { SortType } from 'Models/Enums'

export class ListService {
    myLists = new Array<ToDoList>()

    /** Get the first app start date */
    oldestListDate = new Date()

    constructor() {
    }

    setLists(data: IToDoList[]) {
        if (data != undefined) {
            this.myLists.length = 0
            for (var item of data) {
                let list = ToDoList.map(item)
                if (!list.shared && this.oldestListDate > list.created)
                    this.oldestListDate = list.created
                this.myLists.push(list)
            }
        }
    }

    addOrUpdateList(newList: IToDoList) {
        let existingList = this.myLists.find(d => d.id == newList.id)
        if (existingList) {
            existingList.update(newList)
        }
        else {
            this.myLists.push(ToDoList.map(newList))
        }
    }

    myListsToPlainObject(list?: Array<ToDoList>): Array<IToDoList> {
        let data = new Array<IToDoList>()
        let l = list || this.myLists

        if (!l)
            throw new Error('myListsToPlainObject() failed: data is undefined.')

        l.forEach(list => {
            data.push(list.toPlainObject())
        })

        return data
    }

    getDefaultData(): IToDoList[] {
        let data = new Array<ToDoList>()
        // data from: http://www.travelchicks.tv/magic/wp-content/themes/responsive-child-theme/resources/packlist.jpg

        // List 1        
        let list1 = new ToDoList('Daily food')
        list1.sortType = SortType.Usage
        list1.defaultGroup.items.push(new ToDoItem(list1, 'delicious cake'))
        list1.defaultGroup.items.push(new ToDoItem(list1, 'milk'))
        list1.defaultGroup.items.push((() => {
            let tdi = new ToDoItem(list1, 'butter')
            tdi.done = true
            return tdi
        })())
        list1.defaultGroup.items.push((() => {
            let tdi = new ToDoItem(list1, 'green salat')
            tdi.done = true
            return tdi
        })())
        data.push(list1)

        // List 2   
        let list2 = new ToDoList('ToDo\'s')
        list2.color = 'bold-green'
        list2.groups.push(new Group(undefined, 'general', new Array<ToDoItem>(
            new ToDoItem(list2, 'visit Vienna'),
            new ToDoItem(list2, 'report errors')
        )))
        list2.groups.push(new Group(undefined, 'misc', new Array<ToDoItem>(
            new ToDoItem(list2, 'notice, please report problems or improvement suggestions to enhance this app.'),
            (() => {
                let tdi = new ToDoItem(list2, 'laugh out loud')
                tdi.done = true
                return tdi
            })()
        )))
        data.push(list2)

        // List 3     
        let list3 = new ToDoList('Important')
        list3.color = 'red'
        list3.sortType = SortType.Usage
        list3.defaultGroup.items.push(new ToDoItem(list3, 'stay cool'))
        list3.defaultGroup.items.push(new ToDoItem(list3, 'serenade someone'))
        list3.defaultGroup.items.push(new ToDoItem(list3, 'celebrate on Saturdays'))
        list3.defaultGroup.items.push((() => {
            let tdi = new ToDoItem(list3, 'buy a gift')
            tdi.done = true
            return tdi
        })())
        data.push(list3)

        // List 4
        let list4 = new ToDoList('Travel Checklist')
        list4.groups.push(new Group(undefined, 'Essentials', new Array<ToDoItem>(
            new ToDoItem(list4, 'Wallet'),
            new ToDoItem(list4, 'Passport'),
            new ToDoItem(list4, 'Vitamins')
        )))
        list4.groups.push(new Group(undefined, 'Food and Snacks', new Array<ToDoItem>(
            new ToDoItem(list4, 'Vitamins'),
            new ToDoItem(list4, 'Water Bottle')
        )))
        list4.groups.push(new Group(undefined, 'Clothes', new Array<ToDoItem>(
            new ToDoItem(list4, 'Sunglasses'),
            new ToDoItem(list4, 'Socks'),
            new ToDoItem(list4, 'Swimsuit')
        )))
        list4.groups.push(new Group(undefined, 'Pharmacy/Sundry', new Array<ToDoItem>(
            new ToDoItem(list4, 'Sun-tan Lotion'),
            new ToDoItem(list4, 'Water Bottle')
        )))
        list4.groups.push(new Group(undefined, 'Technology/Electrical', new Array<ToDoItem>(
            new ToDoItem(list4, 'Phone & Phone Charger'),
            new ToDoItem(list4, 'Converter/Adapter'),
            new ToDoItem(list4, 'Netbook')
        )))
        list4.groups.push(new Group(undefined, 'Extra items - What I need', new Array<ToDoItem>(
            new ToDoItem(list4, 'Small Lock'),
            new ToDoItem(list4, 'Extra Memory Cards')
        )))
        data.push(list4)

        return this.myListsToPlainObject(data)
    }
}
