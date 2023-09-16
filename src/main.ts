import { PLATFORM } from 'aurelia-pal'
import { Aurelia, LogManager } from 'aurelia-framework'
import { ConsoleAppender } from 'aurelia-logging-console'
import { GALogger } from 'Helper/GALogger'
import * as system from 'System/index'
import * as Sentry from "@sentry/browser";


//// http://www.mikeobrien.net/blog/client-side-exception-logging-in-aurelia/
LogManager.addAppender(new GALogger())
LogManager.setLevel(LogManager.logLevel.error)


Sentry.init({
    dsn: "https://1870778dec1d2ead7bf1430c939060dd@o279753.ingest.sentry.io/4505892091396096",
});

export function configure(aurelia: Aurelia) {
    aurelia.use.standardConfiguration()
    aurelia.use.plugin(PLATFORM.moduleName('aurelia-dialog'), config => {
        config.useDefaults()
        // config.settings.lock = false
        config.settings.centerHorizontalOnly = true
    })

    aurelia.use.plugin(PLATFORM.moduleName('aurelia-animator-css'))

    if (system.Info.isDevMode)
        aurelia.use.developmentLogging()

    aurelia.start().then(() => aurelia.setRoot(PLATFORM.moduleName('app')))
}
