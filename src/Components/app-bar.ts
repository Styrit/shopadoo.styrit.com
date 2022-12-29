import { autoinject, bindable, Animator } from 'aurelia-framework'

@autoinject
export class AppBar
{
    @bindable open: boolean

    constructor(private animator: Animator, private element: Element)
    {
    }

    private created()
    {
    }

    private openChanged(newValue: boolean, oldValue: boolean)
    {
    }

    openClick()
    {
        this.open = !this.open
    }
}