
export enum DeviceType
{
    Phone,
    Desktop,
    Tablet,
    IoT,
    SurfaceHub,
    Other
}

/**
 * Generate a random whole number.
 */
export function getUniqueID(): string
{
    return Math.random().toString().replace(/[^A-Za-z0-9]/, '')
}

/**
 * Hex to rgb
 */
export function hexToRgb(hex: string): number[]
{
    //// http://stackoverflow.com/questions/5623838/rgb-to-hex-and-hex-to-rgb?answertab=active#tab-top
    return hex.replace(/^#?([a-f\d])([a-f\d])([a-f\d])$/i
        , (m, r, g, b) => '#' + r + r + g + g + b + b)
        .substring(1).match(/.{2}/g)
        .map(x => parseInt(x, 16))
}
