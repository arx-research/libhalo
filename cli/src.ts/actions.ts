/**
 * LibHaLo - Programmatically interact with HaLo tags from the web browser, mobile application or the desktop.
 * Copyright by Arx Research, Inc., a Delaware corporation
 * License: MIT
 */

import {Action, ActionConstructorOptions, ArgumentError, ArgumentParser, Namespace} from "argparse";

class JSONParseAction extends Action {
    constructor(options: ActionConstructorOptions) {
        super(options);
    }

    call(parser: ArgumentParser, namespace: Namespace, values: string, option_string: string | null) {
        try {
            namespace[this.dest] = JSON.parse(values);
        } catch (e) {
            throw new ArgumentError(this, (<Error> e).message);
        }
    }
}

export {JSONParseAction};
