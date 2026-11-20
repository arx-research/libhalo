# Using LibHaLo as a CLI tool on the desktop computer with PC/SC reader (USB NFC reader)

## Pre-built CLI binary

Please check "libhalo" GitHub release page for the standalone binary build of the HaLo CLI binary.

## Using HaLo CLI

The HaLo CLI will automatically detect the PC/SC card reader and the HaLo Tag tapped to it.
Please connect the reader, install appropriate device drivers and tap the tag onto the reader
before executing the commands below.

**Display help:**

```
./halocli -h
```

**Display the tag's version:**

```
./halocli version
```

**Sign some digest using key #1:**

```
./halocli sign -k 1 -d bf1b32988255a2371596d00d1a1c58fd37c1f105243bc8d84509ef9214687ba5
```

**Sign ERC-191 message using key #1:**

```
./halocli sign -k 3 -m 010203
```

**Sign typed data (EIP-712) using key #1:**

Bash:
```
./halocli sign -k 1 --typed-data '{"domain":{"name":"Ether Mail","version":"1","chainId":1,"verifyingContract":"0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC"},"types":{"Person":[{"name":"name","type":"string"},{"name":"wallet","type":"address"}],"Mail":[{"name":"from","type":"Person"},{"name":"to","type":"Person"},{"name":"contents","type":"string"}]},"value":{"from":{"name":"Cow","wallet":"0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826"},"to":{"name":"Bob","wallet":"0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB"},"contents":"Hello, Bob!"}}'
```

Batch (Windows):
```
./halocli sign -k 1 --typed-data "{\"domain\":{\"name\":\"Ether Mail\",\"version\":\"1\",\"chainId\":1,\"verifyingContract\":\"0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC\"},\"types\":{\"Person\":[{\"name\":\"name\",\"type\":\"string\"},{\"name\":\"wallet\",\"type\":\"address\"}],\"Mail\":[{\"name\":\"from\",\"type\":\"Person\"},{\"name\":\"to\",\"type\":\"Person\"},{\"name\":\"contents\",\"type\":\"string\"}]},\"value\":{\"from\":{\"name\":\"Cow\",\"wallet\":\"0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826\"},\"to\":{\"name\":\"Bob\",\"wallet\":\"0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB\"},\"contents\":\"Hello, Bob!\"}}"
```

## Note

You can specify `--output json` to get the command output in the JSON format. By default,
the `halocli` will use JavaScript pretty printed format.

Please review [documentation of the available commands (HaLo Command Set)](/docs/halo-command-set.md) to find out
more details about the available commands. Please note that the CLI commands are invoked slightly differently,
please review the CLI help for the details about command invocation.

## Building from source

If you wish to build the HaLo CLI from source, you can perform the following steps
(requires Node.js 24, corepack, and a working [node-gyp](https://github.com/nodejs/node-gyp#installation) toolchain;
on Linux also `libpcsclite-dev`, on macOS `pcsc-lite` from Homebrew):

1. Clone the repository:
   ```
   git clone https://github.com/arx-research/libhalo.git
   cd libhalo
   ```
2. Install dependencies and build the PC/SC native module:
   ```
   corepack enable
   yarn install --immutable
   yarn build:native
   ```
   **Note:** Dependency install scripts are disabled in this repository (`enableScripts: false` in `.yarnrc.yml`),
   so `yarn install` alone does not compile `@pokusew/pcsclite`. Run `yarn build:native` after every fresh install,
   otherwise the CLI fails at startup with a "Could not locate the bindings file" error.
3. Build the library and the CLI:
   ```
   cd core && yarn tsc && yarn webpack && cd ..
   cd cli && yarn tsc && yarn webpack && cd ..
   # the webpack bundle loads the PC/SC native module from cli/build/
   mkdir -p cli/build
   cp node_modules/@pokusew/pcsclite/build/Release/pcsclite.node cli/build/pcsclite.node
   ```
4. Done! You can now run the CLI directly with Node.js:
   ```
   node cli/dist_webpack/entry_cli.bundle.cjs --help
   ```

Standalone binaries are produced with `pkg`; see the "Build halo-tools with webpack" and "Package HaLo CLI tool"
steps in [`.github/workflows/prod_build_cli.yml`](../.github/workflows/prod_build_cli.yml) for the exact procedure.

**Note:** Due to the fact that the CLI tool is using `nfc-pcsc` library, it has to include a native Node module
for interacting with PC/SC. Thus, the `halocli` binary has to be built separately on each native platform.
