# Using LibHaLo within an Expo mobile application for Android/iOS

You can use LibHaLo within your Expo mobile application for Android/iOS smartphones.

## Note about Expo Go

**Important:** Since LibHaLo relies on the `react-native-nfc-manager` and its native module, it is not possible
to use standard "Expo Go" app.

You need to use a personal build of Expo Go ("development build") in order to include the required native dependencies
that are necessary in order to perform NFC interaction. You can read more in the ["Add custom native code"](https://docs.expo.dev/workflow/customizing/) article of Expo docs.

This guide will provide a step-by-step walkthrough over the entire process.

## Create expo app

Use the following command if you don't have an app already:

```
npx create-expo-app DemoAppWithHalo
```

## Adding the dependencies

These steps are common for both Android and iOS applications:

**Using NPM:**
```
npm install --save react-native-get-random-values
npm install --save react-native-nfc-manager
npm install --save expo-crypto-polyfills
npm install --save @arx-research/libhalo
```

## Expo-specific steps
### Configure `app.json`

Add the following plugin key to your existing `app.json` file:

```
{
  "expo": {
    "plugins": [
      [
        "react-native-nfc-manager",
        {
          "nfcPermission": "Interact with HaLo tags",
          "selectIdentifiers": [
            "481199130E9F01",
            "D2760000850100",
            "D2760000850101"
          ],
          "systemCodes": [],
          "includeNdefEntitlement": true
        }
      ]
    ]
  }
}
```

### Add `metro.config.js`

```javascript
module.exports = {
    resolver: {
        extraNodeModules: require('expo-crypto-polyfills')
    }
};
```

### Add `global.js`

```javascript
import { Platform, LogBox } from "react-native";

if (typeof global.self === "undefined") {
    global.self = global;
}

if (Platform.OS !== "web") {
    require("react-native-get-random-values");
}

global.btoa = global.btoa || require("base-64").encode;
global.atob = global.atob || require("base-64").decode;

global.Buffer = require("buffer").Buffer;

global.process = require("process");
global.process.env.NODE_ENV = __DEV__ ? "development" : "production";
global.process.version = "v9.40";

global.location = {
    protocol: "https",
};
```

### Include `global.js` in your app

In the very first line of your `App.js`, please add:

```javascript
import './global';
```

## Basic usage

Import necessary functions:

```javascript
import NfcManager, {NfcTech} from 'react-native-nfc-manager';
import {execHaloCmdRN} from '@arx-research/libhalo/api/react-native.js';
```

Add basic code to process the NFC tags:

```javascript
// initialize NfcManager on application's startup
NfcManager.start();

export default function App() {
    async function performHaloInteraction() {
        try {
            await NfcManager.requestTechnology(NfcTech.IsoDep);
            const tag = await NfcManager.getTag();

            console.log(await execHaloCmdRN(NfcManager, {
                name: "sign",
                message: "0102",
                keyNo: 1,
            }));
        } catch (ex) {
            console.warn("Oops!", ex);
        } finally {
            // stop the nfc scanning
            NfcManager.cancelTechnologyRequest();
        }
    }

    return (
        <View style={styles.container}>
            <Text>Click on the button and then scan the HaLo tag. Results will appear in the console.</Text>
            <TouchableOpacity style={{padding: 100, backgroundColor: '#FF00FF'}} onPress={performHaloInteraction}>
                <Text>Click here and tap the tag</Text>
            </TouchableOpacity>
            <StatusBar style="auto" />
        </View>
    );
}
```

## Test the application

Generate native project for your platform:

```
npx expo run:android
# or
npx expo run:ios
```

## Example project

Please check GitHub [arx-research/libhalo-example-expo](https://github.com/arx-research/libhalo-example-expo) project for the complete project example.

## Advanced usage

* [Documentation of the execHaloCmdRN API](/docs/api-react-native.md)
* [Documentation of the available commands (HaLo Command Set)](/docs/halo-command-set.md)

## Special thanks

Kudos to the authors of the [draftbit/expo-walletconnect-demo](https://github.com/draftbit/expo-walletconnect-demo/tree/main) repository for figuring out how to polyfill the libraries on expo in a correct way.
