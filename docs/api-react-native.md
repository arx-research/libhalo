# API method initNFCManagerHalo, execHaloCmd

## Importing the method
```javascript
import {initNFCManagerHalo, execHaloCmd} from '@arx-research/libhalo';
```

## initNFCManagerHalo - Call specification
```javascript
async function initNFCManagerHalo(nfcManager)
```

### Input parameter: `nfcManager`

The `NfcManager` singleton instance as imported from `react-native-nfc-manager` library.

### Return value

The function will return a Promise that will resolve to an object.
You should store this object in order to pass it as an argument to `execHaloCmd()` call.

## execHaloCmd - Call specification
```javascript
async function execHaloCmd(command, options)
```

### Input parameter: `command`

An object specifying the command name that you want to invoke, together with the additional command's arguments.
Please check [documentation of the available commands (HaLo Command Set)](/docs/halo-command-set.md) for more details.

### Input parameter: `options`

An object returned from `initNFCManagerHalo` async call.

### Return value

The function will return a Promise that will resolve to an object.
Object keys and values will depend on the command that was requested.
Please check [documentation of the available commands (HaLo Command Set)](/docs/halo-command-set.md) for more details.

### Exceptions

* **HaloTagError**: The command was executed but the tag had responded with an error. Check `ex.name` and `ex.message` for more details.
* **HaloLogicError**: There was some logic error on the client side when trying to execute the command. Check `ex.message` for more details.
* **NFCOperationError**: There was a low-level failure during NFC interaction. Check `ex.message` for more details.
