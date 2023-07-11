# HaLo Tag Firmware Versions
## Introduction

The HaLo Tag's functionality is divided into two components:
* HaLo Core - Open source, provides the core functionality of the HaLo tags (key management, signing and other related functions);
* HaLo Addons - Proprietary extension by Arx Research Inc., which provides additional functionality (background scanning and tag interaction straight with web browsers with no additional software);

Both mentioned components are versioned separately. For clear distinction, HaLo Core versions will always start
with just a number (e.g. "01"), while the HaLo Addons versions are always prefixed with "A" letter followed by a number.

## Version string structure

The HaLo versioning scheme follows the following pattern:

```
<<Prefix>><<MajorVersion>>.<<Minor Version>>.<<Sequential number>>.<<Unique ID>>
```

Where:
* `Prefix` - always empty for HaLo Core, always `A` value for HaLo Addons;
* `MajorVersion` - incremented when there are breaking changes that will need to be explicitly addressed;
* `MinorVersion` - incremented when new features or important patches are added;
* `Sequential number` - number of commits in total, always incremented with the new release;
* `Unique ID` - short commit ID of the release;

Versions could be sorted lexicographically in order to figure out which releases are newer than the other ones.

**Examples:**
Core version: `01.C5.000081.C6EC8952`
Addons version: `A02.01.000092.4E1D7B69`

## Identifying your HaLo Firmware version

The following CLI command will reveal the HaLo firmware version for any tag:

```
./halocli version
```

## Driver compatibility table

The "Req." column represents the following information:
* `C` - the driver only requires HaLo Core software in order to work properly;
* `C+A` - the tag must support both HaLo Core and HaLo Addons for the driver to work properly;

The "Core ver." column represents the minimal HaLo Core version that is required in order
for the tag to support the indicated feature.

| Driver       | Req. | Core ver. |
|--------------|------|-----------|
| PC/SC        | C    | 01.C1     |
| React Native | C    | 01.C1     |
| WebNFC       | C+A  | 01.C1     |
| Credential   | C+A  | 01.C1     |

## Feature compatibility table

The "Req." column represents the following information:
* `C` - only HaLo Core software is required on the NFC tag to interact with the indicated feature;
* `C+A` - both HaLo Core and HaLo Addons are required on the NFC tag to interact with the indicated feature;

The "Core ver." column represents the minimal HaLo Core version that is required in order
for the tag to support the indicated feature.

| Command            | Req. | Core ver. | Comment                                       |
|--------------------|------|-----------|-----------------------------------------------|
| `version`          | C    | 01.C1     | Only for PCSC/React Native.                   |
| `sign`             | C    | 01.C1     | Only with `command.legacySignCommand = true`. |
| `get_pkeys`        | C    | 01.C1     |                                               |
| `write_latch`      | C    | 01.C3     |                                               |
| `sign`             | C    | 01.C4     | All options except for the `password` key.    |
| `sign`             | C    | 01.C6     | All combinations of options.                  |
| `sign_random`      | C    | 01.C4     |                                               |
| `cfg_ndef`         | C+A  | 01.C4     | Addons required.                              |
| `gen_key`          | C    | 01.C6     |                                               |
| `gen_key_confirm`  | C    | 01.C6     |                                               |
| `gen_key_finalize` | C    | 01.C6     |                                               |
| `set_password`     | C    | 01.C6     |                                               |
| `unset_password`   | C    | 01.C6     |                                               |
| `read_ndef`        | C+A  | 01.C1     | Only for PCSC/React Native. Addons required.  |
| `pcsc_detect`      | C    | 01.C1     | Only with CLI tool.                           |
