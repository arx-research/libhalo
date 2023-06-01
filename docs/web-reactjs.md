# Using LibHaLo within a React.js web application

You can use LibHaLo within your React.js web application.

## Adding the dependency

Install the library:

**Using NPM:**
```bash
npm install --save @arx-research/libhalo
```
**Using Yarn:**
```bash
yarn add @arx-research/libhalo
```

## Basic usage

Import the library method:

```javascript
import {execHaloCmdWeb} from '@arx-research/libhalo/api/web.js';
```

Add a state for displaying information to the user:

```javascript
function App() {
    const [statusText, setStatusText] = useState('Click on the button');
    
    // ...
}
```

Create a button that will start NFC interaction:

```javascript
function App() {
    // ...

    return (
        <div className="App">
            <header className="App-header">
                <pre style={{fontSize: 12, textAlign: "left"}}>
                    {statusText}
                </pre>
                <button onClick={() => btnClick()}>
                    Sign message 010203 using key #1
                </button>
            </header>
        </div>
    );
}
```

Implement the button's onclick routine:

```javascript
function App() {
    // ...

    async function btnClick() {
        let command = {
            name: "sign",
            keyNo: 1,
            message: "010203"
        };

        let res;

        try {
            // --- request NFC command execution ---
            res = await execHaloCmdWeb(command);
            // the command has succeeded, display the result to the user
            setStatusText(JSON.stringify(res, null, 4));
        } catch (e) {
            // the command has failed, display error to the user
            setStatusText('Error: ' + String(e));
        }
    }
    
    // ...
}
```

## Example project

Please check GitHub [arx-research/libhalo-example-reactjs](https://github.com/arx-research/libhalo-example-reactjs) project for the complete project example.

## Advanced usage

* [Documentation of the execHaloCmdWeb API](/docs/api-web.md)
* [Documentation of the available commands (HaLo Command Set)](/docs/halo-command-set.md)
