
declare interface String
{
    hexEncode(): string
    hashCode(): string
    contains(searchString: string): boolean
    startsWith(searchString: string, position?: number): boolean
    endsWith(searchString: string, position?: number): boolean
    parseQuery(): any
    truncate(length: number, ending?: string): string
}

if (!String.prototype.truncate)
{
    String.prototype.truncate = function(length, ending)
    {
        if (length == null)
        {
            length = 100
        }
        if (ending == null)
        {
            ending = '...'
        }
        if (this.length > length)
        {
            return this.substring(0, length - ending.length) + ending
        } else
        {
            return this
        }
    }
}

if (!String.prototype.hexEncode)
{
    String.prototype.hexEncode = function()
    {
        var result = ''
        for (var i = 0; i < this.length; i++)
        {
            result += this.charCodeAt(i).toString(16)
        }

        return result
    }
}

if (!String.prototype.hashCode)
{
    String.prototype.hashCode = function()
    {
        return this.split('').reduce((prevHash, currVal) =>
            ((prevHash << 5) - prevHash) + currVal.charCodeAt(0), 0)
    }
}

if (!String.prototype.contains)
{
    String.prototype.contains = function(it)
    {
        return this.indexOf(it) != -1
    }
}

if (!String.prototype.startsWith)
{
    String.prototype.startsWith = function(searchString, position)
    {
        position = position || 0
        return this.substr(position, searchString.length) === searchString
    }
}

if (!String.prototype.endsWith)
{
    String.prototype.endsWith = function(searchString, position)
    {
        var subjectString = this.toString()
        if (typeof position !== 'number' || !isFinite(position) || Math.floor(position) !== position || position > subjectString.length)
        {
            position = subjectString.length
        }
        position -= searchString.length
        var lastIndex = subjectString.indexOf(searchString, position)
        return lastIndex !== -1 && lastIndex === position
    }
}

if (!String.prototype.parseQuery)
{
    String.prototype.parseQuery = function parseQuery()
    {
        var query = {}
        var a = this.split('&')
        for (var i = 0; i < a.length; i++)
        {
            var b = a[i].split('=')
            query[decodeURIComponent(b[0])] = decodeURIComponent(b[1] || '')
        }
        return query
    }
}
