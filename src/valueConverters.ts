import { autoinject } from 'aurelia-framework'

import * as system from 'System/index'
import { SettingsService } from 'Services/SettingsService'

@autoinject
export class ColorKeyToHexColorValueConverter {
    constructor(private settingsService: SettingsService) { }

    toView(value, format) {
        if (value) {
            let hex = this.settingsService.getHexColorFromKey(value)
            if (hex) {
                let rgb = system.hexToRgb(hex)
                return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.85)`
            }
        }
    }
}

export class DateFormatValueConverter {
    toView(value?: Date) {
        if (value instanceof Date)
            return value.toLocaleDateString(navigator.language)
        return value
    }
}