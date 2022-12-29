import { autoinject } from 'aurelia-framework'
import { DialogController } from 'aurelia-dialog'

export interface IModalDialogModel
{
    title?: string,
    text: string,
    showCancelButton?: boolean,
    yesNo?: boolean

}

@autoinject
export class ModalDialog
{
    title: string
    text: string
    showCancelButton: boolean

    okButtonText = 'Ok'
    cancelButtonText = 'Cancel'

    constructor(private dialogController: DialogController)
    {
    }

    activate(model: IModalDialogModel)
    {
        this.title = model.title
        this.text = model.text
        this.showCancelButton = model.showCancelButton

        if (model.yesNo)
        {
            this.okButtonText = 'Yes'
            this.cancelButtonText = 'No'
        }
    }
}