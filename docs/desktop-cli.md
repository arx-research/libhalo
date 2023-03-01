# Using LibHaLo as a CLI tool on the desktop computer with PC/SC reader (USB NFC reader)

## Pre-built CLI binary

Please check "libhalo" GitHub release page for the standalone binary build of the Halo CLI binary.

## Using Halo CLI

The Halo CLI will automatically detect the PC/SC card reader and the Halo Tag tapped to it.
Please connect the reader, install appropriate device drivers and tap the tag onto the reader
before executing the commands below.

**Display help:**

```
./halo-cli -h
```

**Display the tag's version:**

```
./halo-cli version
```

**Sign some digest using key #1:**

```
./halo-cli sign_raw -k 1 -d bf1b32988255a2371596d00d1a1c58fd37c1f105243bc8d84509ef9214687ba5
```

Please review [documentation of the available commands (Halo Command Set)](/docs/halo-command-set.md) to find out
more details about the available commands. Please note that the CLI commands are invoked slightly differently,
please review the CLI help for the details about command invocation.

## Building from source

If you wish to build the Halo CLI from source, you can perform the following steps:

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
   pkg package.json
   ```
3. Done! The binaries will be produced in `cli/dist` subdirectory.
