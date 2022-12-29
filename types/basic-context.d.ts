// BasicContext
// wrong js compile (basiccontext_1.basicContext.show(items, e);):
// declare module 'basiccontext' {
//     interface BasicContext {
//         show(items, event: Event): void
//     }
//     export var basicContext: BasicContext
//     export default basicContext
// }

interface BasicContext
{
    show(items, event: Event, onClose?: Function, onShow?: Function): void
    close(): void
    closeOnTouchMove: boolean
}
declare var basicContext: BasicContext;