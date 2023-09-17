
// writing declaration files:
// https://www.typescriptlang.org/docs/handbook/writing-declaration-files.html

// defined in index.ejs
declare var version: string
declare var isInstalled: boolean


// google analytics
declare var ga: any
declare var gtag: any


// https://github.com/Microsoft/TypeScript/issues/18642
type ShareData = {
    title?: string;
    text?: string;
    url?: string;
    files?: File[];
};
interface Navigator {
    share?: (data?: ShareData) => Promise<void>;
    canShare?: (data?: ShareData) => boolean;
}