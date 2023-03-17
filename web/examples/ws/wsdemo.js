const WebSocketAsPromised = require('websocket-as-promised');

function createWs(url) {
    return new WebSocketAsPromised(url, {
        packMessage: data => JSON.stringify(data),
        unpackMessage: data => JSON.parse(data),
        attachRequestId: (data, requestId) => Object.assign({uid: requestId}, data),
        extractRequestId: data => data && data.uid
    });
}

module.exports = {createWs};

if (window) {
    Object.keys(module.exports).forEach((key) => {
        window[key] = module.exports[key];
    });
}
