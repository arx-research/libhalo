const {Action, ArgumentError} = require("argparse");

class JSONParseAction extends Action {
    constructor() {
        super(...arguments);
    }

    call(parser, namespace, values, option_string) {
        try {
            namespace[this.dest] = JSON.parse(values);
        } catch (e) {
            throw ArgumentError(this, e.message);
        }
    }
}

module.exports = {JSONParseAction};
