
declare interface Array<T>
{
    shuffle(): Array<T>
    delete(item: T): Array<T>
    find(callback: (value: T, index: number, array: T[]) => any, thisArg?: any): T
    swap(newIndex: number, oldIndex: number): Array<T>
}

if (!Array.prototype.delete)
{
    Array.prototype.delete = function(item)
    {
        let i = this.indexOf(item)
        if (i > -1) this.splice(i, 1)
        return this
    }
}

/* no aurelia binding support
if (!Array.prototype.swap) {
    Array.prototype.swap = function (newIndex: number, oldIndex: number) {
        let temp = this[newIndex];
        this[newIndex] = this[oldIndex];
        this[oldIndex] = temp;
        return this
    }
}
*/

if (!Array.prototype.swap)
{
    Array.prototype.swap = function(newIndex: number, oldIndex: number)
    {
        const temp = this[newIndex];
        this.splice(newIndex, 1, this[oldIndex]);
        this.splice(oldIndex, 1, temp);
        return this;
    }
}

if (!Array.prototype.shuffle)
{
    Array.prototype.shuffle = function()
    {
        let counter = this.length, temp, index

        while (counter > 0)
        {
            index = (Math.random() * counter--) | 0

            temp = this[counter]
            this[counter] = this[index]
            this[index] = temp
        }

        return this
    }
}

if (!Array.prototype.find)
{
    Array.prototype.find = function(predicate)
    {
        if (this == null)
        {
            throw new TypeError('Array.prototype.find called on null or undefined')
        }
        if (typeof predicate !== 'function')
        {
            throw new TypeError('predicate must be a function')
        }
        let list = Object(this)
        let length = list.length >>> 0
        let thisArg = arguments[1]
        let value

        for (let i = 0; i < length; i++)
        {
            value = list[i]
            if (predicate.call(thisArg, value, i, list))
            {
                return value
            }
        }
        return undefined
    }
}
