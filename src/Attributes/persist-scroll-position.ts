import { inject, customAttribute, DOM, bindable, TaskQueue } from 'aurelia-framework';
import { AppService } from 'Services/AppService';

@customAttribute('persist-scroll-position')
@inject(DOM.Element, AppService, TaskQueue)
export class PersistScrollPositionAttribute {
    constructor(private element: Element,
        private appService: AppService,
        private taskQueue: TaskQueue) { }

    @bindable targetSelector?: string

    private target: HTMLElement

    bind() {
        this.target = this.targetSelector
            ? document.querySelector(this.targetSelector)
            : this.element as HTMLElement

        if (this.appService.myListsScrollPosition)
            this.target.classList.add('is-invisible')
    }

    attached() {
        if (this.appService.myListsScrollPosition) {
            this.target.scrollTop = this.appService.myListsScrollPosition

            // window.scroll need some time, we delay the visible operation
            this.taskQueue.queueTask(() => {
                this.target.classList.remove('is-invisible')
            })
        }
    }
}
