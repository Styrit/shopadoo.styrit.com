//http://stackoverflow.com/questions/12881212/does-typescript-support-events-on-classes

export interface ILiteEvent<T>
{
    on(handler: Function | { (data?: T): void });
    off(handler: Function | { (data?: T): void });
}

export class LiteEvent<T> implements ILiteEvent<T> {
    private handlers: { (data?: T): void; }[] = [];

    public on(handler: { (data?: T): void })
    {
        this.handlers.push(handler);
    }

    public off(handler: { (data?: T): void })
    {
        this.handlers = this.handlers.filter(h => h !== handler);
    }

    public trigger(data?: T)
    {
        this.handlers.slice(0).forEach(h => h(data));
    }
}
