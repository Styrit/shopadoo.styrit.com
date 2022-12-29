
import * as environment from '../../config/environment.json'

export class Info {
    static readonly isDevMode = environment.debug
    static readonly version = version + (Info.isDevMode ? ' dev' : '')

    // static readonly clientId = new Guid().toString()

    //// also used at styles/_variables.scss and at the metadata/manifest file.
    static readonly accentColor = '#296fcc'

    //// http://stackoverflow.com/a/31757969/451043
    static readonly isEdgeBrowser = /Edge\/\d./i.test(navigator.userAgent)

    static readonly isFirefoxBrowser = /Firefox\/\d./i.test(navigator.userAgent)

    //// http://stackoverflow.com/questions/24861073/detect-if-any-kind-of-ie-msie
    static readonly isInternetExplorerBrowser = (navigator.userAgent.indexOf('Trident') != -1)

    //// attention: ontouchstart is also supported on chrome desktop browser
    static readonly isTouchDevice = 'ontouchstart' in document.documentElement

    // Installed PWA app
    // https://stackoverflow.com/questions/51735869/check-if-user-has-already-installed-pwa-to-homescreen-on-chrome
    static get isInstalled(): boolean {
        return window.matchMedia('(display-mode: standalone)').matches
    }
}
