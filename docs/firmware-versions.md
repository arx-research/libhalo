# HaLo Tag Firmware Versions
## Introduction

The HaLo Tag's functionality is divided into two components:
* HaLo Core - Open source, provides the core functionality of the HaLo tags (key management, signing and other related functions);
* HaLo Addons - Proprietary extension by Arx Research Inc., which provides additional functionality;

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

Whenever the "Minimal version" column contains the version with "A" prefix, it means that
HaLo Addons extension is required in order for the tag to support the indicated feature.

| Driver       | Minimal version | Comment          |
|--------------|-----------------|------------------|
| PC/SC        | 01.C1           |                  |
| React Native | 01.C1           |                  |
| WebNFC       | A01.C1          | Addons required. |
| Credential   | A01.C1          | Addons required. |

## Feature compatibility table

Whenever the "Minimal version" column contains the version with "A" prefix, it means that
HaLo Addons extension is required in order for the tag to support the indicated feature.

| Command           | Minimal version | Comment                                       |
|-------------------|-----------------|-----------------------------------------------|
| `version`         | 01.C1           | Only for PCSC/React Native.                   |
| `sign`            | 01.C1           | Only with `command.legacySignCommand = true`. |
| `get_pkeys`       | 01.C1           |                                               |
| `gen_key`         | 01.C3           | Only without `command.entropy` argument.      |
| `write_latch`     | 01.C3           |                                               |
| `sign`            | 01.C4           | All combinations of arguments.                |
| `sign_random`     | 01.C4           |                                               |
| `cfg_ndef`        | A01.C4          |                                               |
| `gen_key`         | 01.C4           | All combinations of arguments.                |
| `gen_key_confirm` | 01.C4           |                                               |
| `read_ndef`       | A01.C1          | Only for PCSC/React Native.                   |
| `pcsc_detect`     | 01.C1           | Only with CLI tool.                           |
