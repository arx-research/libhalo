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

#### options.statusCallback
```
options.statusCallback: null/function
```

Depending on the command execution method that is used by LibHaLo, the operating system might, or might not
display the standard NFC scanning prompt.

With the `credential` execution method (mostly user on iOS/Windows platforms), the operating system would display
a standard NFC scanning prompt that would instruct the user to scan the HaLo tag. This is not the case for
`webnfc` (mostly on Android) execution method, where there is no standard scanner prompt at all.
In order to smoothen  the user experience for that platform, LibHaLo will automatically emulate the NFC
scanning prompt in HTML.

You can customize this behavior by passing `options.statusCallback`. When such callback function is provided,
the LibHaLo will not inject any HTML content to your website. The callback will be invoked on different steps
of the NFC scanning process, allowing your web application to provide appropriate instructions to the user
and increase user experience.

Example callback:
```
statusCallback: (cause, statusObj) => console.log(cause, statusObj)
```

The callback could be called with the following `cause` as a first argument:

* `init` - the tag scanning process was initiated, the frontend should ask the user to tap the tag
  to the back of the smartphone;
* `again` - another tap is needed to complete this operation, the frontend should ask the user to
  keep holding the tag to the back of the smartphone;
* `retry` - the tag was scanned but there was an error, the operation is still running,
  the frontend should ask the user to try to tap the tag once again;
* `scanned` - the tag was scanned successfully, but the operation is not yet completed since
  the library is postprocessing the result, the frontend should ask the user to untap the tag
  and wait a moment until the operation is completed;

The `statusObj` is the object that contains the following keys:

* `execMethod` - either:
  * `credential` - if the credential prompt method is being used in order to scan the tag (mostly on iOS/Windows);
  * `webnfc` - if the WebNFC method is used in order to scan the tag (mostly on Android);
* `execStep` - a string containing more detailed information about current command execution step;
* `cancelScan` - a function that allow to cancel the scanning process at any moment (usually when user requests so by clicking the appropriate button);

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


# Debugging through the developer's console
In case when you are suspecting some bugs related with LibHaLo or HaLo cards themselves and need a more detailed debugging, it is possible
to enable additional debug printouts for the web drivers.

Debug printouts are enabled by executing the following code, either in your application using LibHaLo or straight in the developer's console prompt itself:
```
localStorage.setItem('DEBUG_LIBHALO_WEB', '1')
```

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
