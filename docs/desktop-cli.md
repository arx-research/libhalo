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

If you wish to build the HaLo CLI from source, you can perform the following steps:

1. Clone the repository:
   ```
   git clone https://github.com/arx-research/libhalo.git
   ```
2. Install dependencies:
   ```
   # go to the project root directory
   cd libhalo
   npm install
   # go to the cli/ subdirectory
   cd cli
   npm install
   npm install -g pkg
   pkg package.json
   ```
3. Done! The binaries will be produced in `cli/dist` subdirectory.

**Note:** Due to the fact that the CLI tool is using `nfc-pcsc` library, it has to include a native Node module
for interacting with PC/SC. Thus, the `halocli` binary has to be built separately on each native platform.
