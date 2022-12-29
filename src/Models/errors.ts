// There is no comfortable way to cast the type on the cache block, 
// so handling the type here makes no sense
// export class ErrorObject<T> extends Error
export class ResponseError extends Error
{
    public response: Response
    constructor(message: string, error: Response)
    {
        super(message)
        this.response = error
        // https://stackoverflow.com/a/41144648
        // Set the prototype explicitly.
        Object.setPrototypeOf(this, ResponseError.prototype)
    }
}

export class CustomError extends Error
{
    public code: number
    constructor(message: string, code: number)
    {
        super(message)
        this.code = code
        Object.setPrototypeOf(this, CustomError.prototype)
    }
}

export class ErrorInfo
{
    public error: Error
    public retryFunction: () => void
    public taskErrorInfoText: string

    constructor(error: Error)
    {
        this.error = error
    }
}
