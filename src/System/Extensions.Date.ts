
declare interface Date {
    toSimpleString(): string
    localeCompare(date: Date): number
    addDays(days: number): Date
}

if (!Date.prototype.toSimpleString) {
    Date.prototype.toSimpleString = function () {
        var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        return this.getDate() + ' ' + months[this.getMonth()] + ' ' + this.getFullYear()
    }
}

if (!Date.prototype.addDays) {
    Date.prototype.addDays = function (days) {
        const newDate = new Date(this)
        newDate.setDate(newDate.getDate() + days)
        return newDate
    }
}

if (!Date.prototype.localeCompare) {
    Date.prototype.localeCompare = function (date: Date) {
        return this < date ? -1 : (this > date ? 1 : 0)
    }
}