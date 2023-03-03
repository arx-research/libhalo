const {Action} = require("argparse");

class JSONParseAction extends Action {
    constructor() {
        super(...arguments);
    }

    call(parser, namespace, values, option_string) {
        namespace[this.dest] = JSON.parse(values);
    }
}

module.exports = {JSONParseAction};
