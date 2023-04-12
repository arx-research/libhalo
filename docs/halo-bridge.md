# HaLo Bridge

HaLo Bridge is a special tool dedicated for desktop computers. The tool is provided in a form of native program
for your platform (Windows, Linux, Mac OS). Once you launch HaLo Bridge, it will connect with your physical
USB NFC reader and expose it as a WebSocket Server.

In particular, it means that whenever you will have HaLo Bridge tool running on your computer, any authorized
website will be able to interact directly with your USB NFC reader in order to sign some information with HaLo
tags.

## Architecture graph

![Graph: Interaction between USB NFC reader, computer and external website.](/docs/images/halo_bridge_graph.png)

## Using HaLo Bridge

### End-user side

1. Obtain an NFC PC/SC reader compliant with ISO 14443A protocol and your operating system.
2. Download HaLo Tools distribution from this repository and install it (or simply unpack it,
if no installer is provided for your platform).
3. Run `halo-bridge` binary (on MacOS: "HaLo Bridge Server" straight from Launchpad).
4. The terminal window with HaLo Bridge Server and the diagnostic web page should automatically pop up.
5. If the auto-diagnostics is successful, you can navigate to any website that supports HaLo Bridge
and follow the instructions provided by the website in order to perform HaLo commands with the physical tags.
Example website: [https://bulk.vrfy.ch/](https://bulk.vrfy.ch/).

### Web application's developer side

#### 1. Find HaLo Bridge address

Use `haloFindBridge()` library function in order to obtain the HaLo Bridge address:

```javascript
import {haloFindBridge} from '@arx-research/libhalo';
   
let wsAddress = await haloFindBridge();
```

Please note that this function would throw an exception if the user doesn't have `halo-bridge` up and running,
or for any reason it's not possible to connect with the HaLo Bridge. In case this call throws an exception,
you should ask the user to check if `halo-bridge` is running on their computer.

#### 2. Connect with WebSocket

Use whatever WebSocket Client suits you and connect to the `wsAddress` obtained from the previous step.

#### 3. Handle incoming events

On your WebSocket client, you will be receiving certain incoming messages. All messages are encoded in the JSON
format with the following structure:

```
{
    "event": "<event name>",
    "uid": "<uid>",
    "data": { /* ... depending on event ... */ }
}
```

Where the `event` key is a string representing the name of particular event.

Possible incoming events are the following:

* `ws_connected` - welcome event sent by the server;
* `reader_added` - a new NFC reader was detected, the reader's name will be provided as `data.reader_name`; 
* `reader_removed` - the existing NFC reader was disconnected, the reader's name will be provided as `data.reader_name`;
* `handle_added` - a reader has detected new HaLo tag (`data.reader_name` - reader's name, `data.handle` - random value, a handle to the connected tag);
* `handle_removed` - a reader has detected that HaLo tag was un-tapped (`data.reader_name` - reader's name, `data.handle` - random value, a handle to the connected tag);
* `exec_success` - HaLo command execution has succeeded, (`uid` - identifier of the command request; `data.*` - command execution result);
* `exec_exception` - HaLo command failed to execute (`data.exception.message` - exception message, `data.exception.stack` - full call stack of the exception);

#### 4. Send some commands for execution

Once you receive `handle_added` event, there will be the tag's handle associated with it (`data.handle`). You can store that handle and use it
to execute HaLo commands against the connected tag, as long as it's present on the NFC reader.

In order to do so, you need to send such a JSON to the WebSocket:
```
{
    "type": "exec_halo",
    "handle": handle,
    "uid": uid,
    "command": {
        "name": "sign",
        "message": "010203",
        "keyNo": 1
    }
}
```

Where `handle` is the tag's connection handle, and `uid` can be set to a random unique value. The `uid` value returned
in `exec_success` or `exec_exception` events will correspond to the `uid` that you have provided here.

An example HaLo command is provided in the `command` object of the request. Please check [HaLo Command Set](https://github.com/arx-research/libhalo/blob/master/docs/halo-command-set.md)
for the detailed description of commands that may be requested.
