### PWA

Templates

- <https://www.jujens.eu/posts/en/2019/Sep/01/aurelia-pwa/>
- <https://webpack.js.org/guides/progressive-web-application/>

Workbox

- <https://developers.google.com/web/tools/workbox>
- <https://developers.google.com/web/tools/workbox/modules/workbox-background-sync>

### Aurelia

This project is bootstrapped by [aurelia-cli](https://github.com/aurelia/cli). For more information, go to <https://aurelia.io/docs/cli/webpack>

You can change the standard webpack configurations from CLI easily with something like this: `npm start -- --open --port 8888`. However, it is better to change the respective npm scripts or `webpack.config.js` with these options, as per your need.

To enable Webpack Bundle Analyzer, do `npm run analyze` (production build).

To enable hot module reload, do `npm start -- --hmr`.

To change dev server port, do `npm start -- --port 8888`.

To change dev server host, do `npm start -- --host 127.0.0.1`

**PS:** You could mix all the flags as well, `npm start -- --host 127.0.0.1 --port 7070 --open --hmr`
