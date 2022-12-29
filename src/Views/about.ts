import { autoinject } from 'aurelia-framework'

import * as system from 'System/index'
import { ListService } from 'Services/ListService'

@autoinject
export class AboutViewModel
{
    version: string
    showRating: boolean

    constructor(private listService: ListService)
    {
        this.version = system.Info.version        
    }
}