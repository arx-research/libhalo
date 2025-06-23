# HaLo Gateway: Creating custom themes

## Creating a new theme

1. Obtain recent [halo-tools](https://github.com/arx-research/libhalo/releases) release.
2. In the working directory with the `halo-gateway` binary, run the following command:
   ```
   git clone https://github.com/arx-research/halo-gateway-themes themes
   ```
3. Your resulting directory structure should resemble this:
   ```
    $ find .
    .
    ./halo-gateway
    ./themes
    ./themes/example
    ./themes/example/gateway_executor.html
    ./themes/example/lennyface.png
    ./themes/example/style.css
    ```
4. Copy the `themes/example` directory as `themes/your_theme_name` and edit it.

## Testing your theme

1. Launch `./halo-gateway --disable-cache` locally to so spin up a local server.
2. Connect with your server using [LibHaLo Demo on using Gateway](https://halo-demos.arx.org/examples/gateway_requestor.html), fill out the form as follows:

   | Setting name                                       | Setting value              |
   |----------------------------------------------------|----------------------------|
   | Override the default gateway URL                   | `ws://127.0.0.1:32842`     |
   | Override the default URL in QR code                | `http://127.0.0.1:32842/e` |
   | Override theme name                                | `your_theme_name`          |
   | How would you like to sign the message             | _(whatever)_               |
   | Hex-encoded message to be signed with ECDSA/Keccak | _(whatever)_               |

3. Click on "Pair and request to sign with key #1" which should create a QR code (and a link) pointing to the gateway with your desired theme.

## Deploying your theme to public Arx HaLo Gateway servers

Feel free to create a Pull Request on [arx-research/halo-gateway-themes](https://github.com/arx-research/halo-gateway-themes) repository.

## Using your theme

Pass the `themeName` option when constructing `HaloGateway` object to instruct which theme should be used.

```
let gate = new HaloGateway('wss://s1.halo-gateway.arx.org', {
    themeName: "your_theme_name"
});
```
