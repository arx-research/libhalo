# API method execHaloCmdPCSC

## Importing the method
```javascript
import {execHaloCmdPCSC} from '@arx-research/libhalo/api/desktop';
// or
import {execHaloCmdPCSC} from '@arx-research/libhalo/api/desktop.js';
```

## Call specification
```javascript
async function execHaloCmdPCSC(command, reader)
```

### Input parameter: `command`

An object specifying the command name that you want to invoke, together with the additional command's arguments.
Please check [documentation of the available commands (HaLo Command Set)](/docs/halo-command-set.md) for more details.

### Input parameter: `reader`

The Reader object as returned by `nfc-pcsc` library's callback.

### Return value

The function will return a Promise that will resolve to an object.
Object keys and values will depend on the command that was requested.
Please check [documentation of the available commands (HaLo Command Set)](/docs/halo-command-set.md) for more details.

### Exceptions

* **HaloTagError**: The command was executed but the tag had responded with an error. Check `ex.name` and `ex.message` for more details.
* **HaloLogicError**: There was some logic error on the client side when trying to execute the command. Check `ex.message` for more details.
* **NFCOperationError**: There was a low-level failure during NFC interaction. Check `ex.message` for more details.
