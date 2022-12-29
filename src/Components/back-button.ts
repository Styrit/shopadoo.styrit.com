import { autoinject, TaskQueue } from 'aurelia-framework'
import { Router, RouteConfig, NavigationInstruction, RedirectToRoute } from 'aurelia-router'

import * as system from 'System/index'
import { AppService } from 'Services/AppService'

@autoinject
export class BackButton {
    show: boolean

    constructor(private router: Router, private appService: AppService) {

    }

    created() {
        this.show = this.showInBrowser()
    }

    goBack() {
        if (this.showInBrowser())
            this.router.navigateToRoute("MyLists")
        else
            this.router.navigateBack()
    }

    private showInBrowser(): boolean {
        /**         
         * on first page request, set a flag if the page is the root page
         * - if not, show the back button
         */

        return system.Info.isInstalled // && !this.appService.hasRootRequest
    }
}