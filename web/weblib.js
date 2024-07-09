/**
 * LibHaLo - Programmatically interact with HaLo tags from the web browser, mobile application or the desktop.
 * Copyright by Arx Research, Inc., a Delaware corporation
 * License: MIT
 */

import * as all_exports from "./web_apis.js";

if (typeof window !== "undefined") {
    Object.keys(all_exports).forEach((key) => {
        window[key] = all_exports[key];
    });
}
