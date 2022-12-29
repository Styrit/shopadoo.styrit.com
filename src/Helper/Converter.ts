// https://github.com/jdanyow/aurelia-converters/blob/master/src/index.js
import { SortType } from 'Models/Enums'

export class NumberToStringValueConverter
{
    toView(value)
    {
        if (!value)
            return null
        return String(value)
    }

    fromView(value)
    {
        if (!value)
            return null
        return Number(value)
    }
}

export class ShowActiveItemsFirstValueConverter
{
    toView(value, sortType: SortType)
    {
        if (sortType == SortType.Manual)
            return false
        return value
    }
}