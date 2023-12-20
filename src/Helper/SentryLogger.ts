import { Logger } from 'aurelia-logging'
import * as Sentry from "@sentry/browser";

export class SentryLogger {
    constructor() {
        //// handle general js error
        window.addEventListener('error', (errorEvent: ErrorEvent) => {
            this.log(errorEvent.error)
        })

        //// handle Promise rejection
        window.addEventListener('unhandledrejection', (rejection: any) => {
            let errors = new Array<any>('Unhandled promise rejection')

            if (rejection.detail && rejection.detail.reason) {
                errors.push(rejection.detail.reason)

                if (rejection.detail.reason.responseJSON && rejection.detail.reason.responseJSON.error)
                    errors.push(rejection.detail.reason.responseJSON.error)
            }

            let stack = (rejection.reason && rejection.reason.stack) || (rejection.detail && rejection.detail.reason && rejection.detail.reason.stack)
            if (stack) {
                errors.push(stack)
            }

            //// do not log this error remote - there are to much errors of this type :-( 
            //// only lot to console
            if (errors.length == 1) {
                console.warn('ERROR: Unhandled promise rejection with no detail information (no remote logging)')
            }
            else {
                this.log(errors)
            }
        })
    }

    debug(logger: Logger, ...rest: any[]): void { }
    info(logger: Logger, ...rest: any[]): void { }
    warn(logger: Logger, ...rest: any[]): void { }

    error(logger: Logger, ...rest: any[]): void {
        if (rest.length) {
            //// handle misc common errors
            if (rest[0] == 'Router navigation failed, and no previous location or fallbackRoute could be restored.')
                return

            //// handle itemNotFound responses
            if (rest.length > 1 && typeof rest[1] == 'object') {
                let obj = rest[1]
                if (obj.code == 'itemNotFound')
                    return
                if (obj.responseJSON && obj.responseJSON.error && obj.responseJSON.error.code == 'itemNotFound')
                    return
            }
        }

        rest.unshift(`[${logger.id}]`)
        this.log(rest, false)
    }

    private log(errors: any | any[], fatal = true) {
        try {
            if (!(errors instanceof Array)) {
                errors = new Array<any>(errors)
            }

            let msgList = new Array<string>()

            for (let item of errors) {
                if (typeof item == 'string') {
                    msgList.push(item)
                }
                else if (item instanceof Error) {
                    msgList.push(item.stack || item.message)

                    //// UWP errors can have a number
                    if ((<any>item).number !== undefined)
                        msgList.push('error number: ' + (<any>item).number)
                }
                else if (typeof item == 'object') {
                    msgList.push(JSON.stringify(item))
                }
            }

            const msg = msgList.join(' | ')
            console.error(fatal ? 'FATAL' : 'Logged' + ' Sentry ERROR: ' + msg)

            Sentry.captureMessage(msg, fatal ? "fatal" : "error")

        }
        catch (error) {
            console.error('Error on SentryLogger >>', error)
        }
    }
}