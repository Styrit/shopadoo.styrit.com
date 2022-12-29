import { TaskQueue, Container } from 'aurelia-framework'

export class UIHelper
{
    static taskQueue = Container.instance.get(TaskQueue) as TaskQueue

    static loadUrlInIframe(url: string): Promise<void>
    {
        return new Promise<void>((resolve, reject) =>
        {
            let iframe = document.getElementById('urlLoaderIframe') as HTMLIFrameElement
            if (!iframe)
            {
                iframe = document.createElement('iframe')
                iframe.id = 'urlLoaderIframe'
                iframe.style.position = 'absolute'
                iframe.style.width = '1px'
                iframe.style.height = '1px'
                iframe.style.top = '-100px'
                document.body.appendChild(iframe)

                iframe.onerror = (errorEvent) =>
                {
                    reject(errorEvent)
                }

                iframe.onload = (element) =>
                {
                    let iFrameWindow = element.target as HTMLIFrameElement
                    try
                    {
                        // by accessing the href filed, an error is thrown if the response failed
                        let href = iFrameWindow.contentWindow.location.href
                        resolve()
                    }
                    catch (error)
                    {
                        reject(error)
                    }
                }             

                // making sure the iframe is loaded in the dom
                // the aurelia ui must be loaded already, otherwise the iframe well be removed again - this throws a 'canceled' event on location.replace
                this.taskQueue.queueTask(() => iframe.contentWindow.location.replace(url))
            }
            else
            {
                //// do not affect the browser history by setting the url
                //// http://stackoverflow.com/questions/2245883/browser-back-acts-on-nested-iframe-before-the-page-itself-is-there-a-way-to-av   
                iframe.contentWindow.location.replace(url)
            }
        })
    }
}