# API method execHaloCmdWeb

## Importing the method
```
import {execHaloCmdWeb} from '@arx-research/libhalo/api/web.js';
```

**Note:** This step is only necessary for module-based applications. You don't need to add this line if you
are including libhalo with `<script src="..."></script>` tag.

## Call specification
```
async function execHaloCmdWeb(command)
async function execHaloCmdWeb(command, options)
```

### Input parameter: `command`

An object specifying the command name that you want to invoke, together with the additional command's arguments.
Please check [documentation of the available commands (HaLo Command Set)](/docs/halo-command-set.md) for more details.

### Input parameter: `options`

An object with the following keys. All keys are optional.

#### options.method
```
options.method: null/"webnfc"/"credential"
```

Which NFC interaction method to use. Choices:

* (default) not present or `null` - automatically detect the best method;
* `"webnfc"` - use WebNFC standard for NFC interaction;
* `"credential"` - use credential API for NFC interaction;

#### options.noDebounce
```
options.noDebounce: true/false
```

Don't automatically debounce calls to `execHaloCmdWeb` when it's concurrently called multiple times. Choices:

* (default) `false` - automatically debounce calls;
* `true` - don't automatically debounce calls, not recommended;

#### options.compatibleCallMode
```
options.compatibleCallMode: true/false
```

Use the compatible protocol which is compatible with earlier batches of HaLo tags.

* (default) `true` - use the compatible protocol compatible with all tags (use only if needed);
* `false` - use more recent protocol compatible with tags `v=01.C5` onwards only;

**Note:** Optionally, set this to `false` if all your tags are generating URLs with the `v` (version)
query string parameter, and this parameter is higher or equal `01.C5` (by lexicographical comparison).

#### options.statusCallback
```
options.statusCallback: null/function
```

Optionally, you can provide a callback which will inform you about certain status events while
the command execution process is ongoing. This could be used to increase user's experience.

Example callback:
```
statusCallback: (cause, execMethod) => console.log(cause, execMethod)
```

The callback could be called with the following `cause` as a first argument:

* `init` - the tag scanning process was initiated, the frontend should ask the user to tap the tag
  to the back of the smartphone;
* `retry` - the tag was scanned but there was an error, the operation is still running,
  the frontend should ask the user to try to tap the tag once again;
* `scanned` - the tag was scanned successfully, but the operation is not yet completed since
  the library is postprocessing the result, the frontend should ask the user to untap the tag
  and wait a moment until the operation is completed;

The `execMethod` will be either:

* `credential` - if the credential prompt method is being used in order to scan the tag (mostly on iOS/Windows);
* `webnfc` - if the WebNFC method is used in order to scan the tag (mostly on Android);

The application's frontend could differentiate the UI behavior depending on the `execMethod` that is being used
by the library in order to provide better user experience.

#### options.debugCallback
```
options.debugCallback: null/function
```

Optionally, you can provide a callback which will provide more detailed information
while the command execution process is ongoing. Not recommended.

This option is dedicated only for debugging.

Example callback:
```
debugCallback: (cause) => console.log(cause)
```

### Return value

The function will return a Promise that will resolve to an object.
Object keys and values will depend on the command that was requested.
Please check [documentation of the available commands (HaLo Command Set)](/docs/halo-command-set.md) for more details.

### Exceptions

* **HaloTagError**: The command was executed but the tag had responded with an error. Check `ex.name` and `ex.message` for more details.
* **HaloLogicError**: There was some logic error on the client side when trying to execute the command. Check `ex.message` for more details.
* **NFCPermissionRequestDenied**: Unable to execute the command. We were asking the user to grant a permission,
  but the permission request was denied. The frontend needs to ask the user to reset the permissions.
* **NFCMethodNotSupported**: If a particular execution method was requested, this method is not supported by the current platform.
  If no method was explicitly specified, it seems like the platform doesn't support NFC interaction at all.
  Check `ex.message` for more details.
* **NFCAbortedError**: Detected multiple concurrent calls to `execHaloCmdWeb` method. Excess concurrent calls except for one
  will be rejected with this exception. The frontend should gracefully ignore that exception.
* **NFCOperationError**: There was a low-level failure during NFC interaction. Check `ex.message` for more details.


# Helper methods exclusive to the web environment

## haloGetDefaultMethod()
Check which NFC command execution method will be used on the current device. This call would return either
`"credential"` or `"webnfc"`.

## haloCheckWebNFCPermission()
Check if the user has granted us the permission to use WebNFC interface. This is relevant only if the call to
`haloGetDefaultMethod()` has returned `"webnfc"`.

This function behaves differently depending on whether it was called with or without the user's interaction.

### Function behavior without user's interaction
When this function is called early after web page load (and without any explicit user's interaction), it will
immediately return a boolean with the following meaning:

* `true` - user has already granted us the WebNFC usage permission in the past, the `execHaloCmdWeb()` function may
  be called immediately;
* `false` - we don't have permission to use WebNFC on that device, the user needs to be interactively asked
  to grant us the permission;

### Function behavior with user's interaction
When this function is called within the button onClick handler, it will either:

1. Return `true` immediately if the user has already granted us the WebNFC usage permission in the past;
2. Return `false` immediately if the user has already explicitly denied us the permission to WebNFC in the past;
3. Display WebNFC permission prompt to the user and hang until the user decides whether to allow for
   the usage of WebNFC or not. After the user makes the decision, the function will either return `true`
   (the permission is now granted) or `false` (user has denied).
