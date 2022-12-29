
declare interface Number
{
    localeCompare(number: number): number
    asTime(): string
}

if (!Number.prototype.localeCompare)
{
    Number.prototype.localeCompare = function(num: number)
    {
        return this < num ? -1 : (this > num ? 1 : 0)
    }
}

if (!Number.prototype.asTime)
{
    Number.prototype.asTime = function()
    {
        var mins = Math.floor(this / 60)
        var seconds = Math.floor(this % 60)
        return mins.toString() + ':' + (seconds < 10 ? '0' + seconds.toString() : seconds.toString())
    }
}