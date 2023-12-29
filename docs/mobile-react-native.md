# Using LibHaLo within a React Native mobile application for Android/iOS

You can use LibHaLo within your React Native mobile application for Android/iOS smartphones.

## Adding the dependencies

These steps are common for both Android and iOS applications:

**Using NPM:**
```
npm install --save react-native-nfc-manager
npm install --save @arx-research/libhalo
```
**Using Yarn:**
```bash
yarn add react-native-nfc-manager
yarn add @arx-research/libhalo
```

## Configure react-native-nfc-manager

You need to perform the following extra steps in your React Native project in order to be able to work
with the NFC tags. These instructions will depend on the target platform. You can perform these steps
for both Android and iOS on the same project.

### Android

1. Add NFC permission in `android/app/src/main/AndroidMainfest.xml`:
    ```
    // add this inside <manifest ...> tag
    <uses-permission android:name="android.permission.NFC" />
    ```

### iOS

1. Run `pod install`:
   ```
   # relative to the project's main directory
   cd ios && pod install
   ```

2. Close your project in XCode if you have it opened. Re-open the project using
   `ios/<<App name>>.xcworkspace` file only. The project won't work if you load it in a different way.

3. Add the following keys in `ios/<<App name>>/Info.plist`:
    ```
    <key>NFCReaderUsageDescription</key>
    <string>NFC is used to interact with HaLo Tags</string>
    <key>com.apple.developer.nfc.readersession.iso7816.select-identifiers</key>
    <array>
      <string>481199130E9F01</string>
      <string>D2760000850100</string>
      <string>D2760000850101</string>
    </array> 
    ```

4. In XCode, navigate into `Signing & Capabilities` and click on `+ Capability` in order to add
    `Near Field Communication Tag Reading`. Please make sure the capability is added in both Debug and Release
    configurations.

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

function App() {
  // button pressed routine
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
    <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
      <TouchableOpacity style={{padding: 100, backgroundColor: '#FF00FF'}} onPress={performHaloInteraction}>
        <Text>Click here and tap the tag</Text>
      </TouchableOpacity>
    </View>
  );
}
```

## Example project

Please check GitHub [arx-research/libhalo-example-react-native](https://github.com/arx-research/libhalo-example-react-native) project for the complete project example.

## Advanced usage

* [Documentation of the execHaloCmdRN API](/docs/api-react-native.md)
* [Documentation of the available commands (HaLo Command Set)](/docs/halo-command-set.md)
