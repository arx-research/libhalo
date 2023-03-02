# Using LibHaLo as a standalone JavaScript library in a classic HTML application

You can use LibHaLo as a single standalone JavaScript file, which could be included
in a classic HTML application.

## Pre-built JavaScript library

Please check GitHub releases page in order to grab the recent build of `libhalo.js` library.

## Basic usage

Include the `libhalo.js` on your webpage:

```html
<script src="libhalo.js"></script>
```

Create a minimal user interface:

```html
<div id="statusText">Please click on the button below.</div>
<button onclick="btnPressed();">Click here</button>
```

Call the library inside the button click routine:

```javascript
async function btnPressed() {
    let command = {
        name: "sign",
        keyNo: 1,
        digest: "6e76e202b71892e9ee32a634eefcf522ba1c4cb4eadd7e4562ced1270214c41e"
    };
    
    document.getElementById('statusText').innerText = "Please tap NFC tag to the back of your smartphone...";

    try {
        let res = await execHaloCmdWeb(command);
        // display operation result
        document.getElementById('statusText').innerText = JSON.stringify(res, null, 4);
    } catch (e) {
        // display error
        document.getElementById('statusText').innerText = e;
    }
}
```

## Usage examples

Please review the following demonstrative applications:

* [Simple digest signing demo (version >=C4)](/web/examples/simple.html)
* [Simple digest signing demo (earlier versions)](/web/examples/compatible.html)
* [More advanced message signing demo (all versions)](/web/examples/demo.html)

## Advanced usage

* [Documentation of the execHaloCmdWeb API](/docs/api-web.md)
* [Documentation of the available commands (HaLo Command Set)](/docs/halo-command-set.md)

## Building library from source

If you don't want to use the pre-built library file, you can build the library on your own.

1. [Install Node.JS](https://nodejs.org/en/download/)
2. Clone the libhalo repository.
   ```
   git clone https://github.com/arx-research/libhalo.git
   cd libhalo
   ```
3. Install dependencies.
   ```
   npm install
   ```
4. Build the library.
   ```
   cd web
   webpack
   ```
5. Done! The library will be built in `web/dist` directory.
