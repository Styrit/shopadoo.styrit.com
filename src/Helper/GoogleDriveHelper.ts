
export class MultiPartBuilder
{
    body: string
    contentType: string

    constructor(private content: string, public mimeType: string, metadata: { [key: string]: any })
    {
        // https://developers.google.com/drive/v3/web/manage-uploads#multipart
        let boundary = Math.random().toString(36).slice(2);
        this.contentType = 'multipart/related; boundary=' + boundary

        let parts = new Array<string>(
            '\r\n--', boundary, '\r\n',
            'Content-Type: application/json; charset=UTF-8', '\r\n\r\n',

            JSON.stringify(metadata), '\r\n',

            '\r\n--', boundary, '\r\n',
            'Content-Type: ', mimeType, '\r\n\r\n',

            content,
            '\r\n--', boundary, '--')

        this.body = parts.join('')
    }
}