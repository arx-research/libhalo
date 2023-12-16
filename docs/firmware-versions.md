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
### Drivers available in HaLo Core (OSS)

| Driver       | Core ver. |
|--------------|-----------|
| PC/SC        | 01.C1     |
| React Native | 01.C1     |

Core ver. - first HaLo Core version to support the indicated driver.

### Drivers only available with HaLo Addons extension

| Driver       | Addons ver. |
|--------------|-------------|
| WebNFC       | A01.01      |
| Credential   | A01.01      |

Addons ver. - first HaLo Addons version to support the indicated driver.

## Command compatibility table
### Commands available in HaLo OSS

| Command            | Core ver. | Comment                                       |
|--------------------|-----------|-----------------------------------------------|
| `version`          | 01.C1     | Only for PCSC/React Native drivers.           |
| `sign`             | 01.C1     | Only with `command.legacySignCommand = true`. |
| `get_pkeys`        | 01.C1     |                                               | 
| `write_latch`      | 01.C3     |                                               |
| `sign`             | 01.C4     | All combinations of options.                  |
| `sign_random`      | 01.C4     |                                               |
| `get_key_info`     | 01.C6     |                                               |
| `gen_key`          | 01.C7     |                                               |
| `gen_key_confirm`  | 01.C7     |                                               |
| `gen_key_finalize` | 01.C7     |                                               |
| `set_password`     | 01.C7     |                                               |
| `replace_password` | 01.C7     |                                               |
| `unset_password`   | 01.C7     |                                               |
| `get_data_struct`  | 01.C8     |                                               |
| `get_graffiti`     | 01.C8     |                                               |
| `store_graffiti`   | 01.C8     |                                               |
| `pcsc_detect`      | 01.C1     | Only with CLI tool.                           |

Core ver. - first HaLo Core version to officially support the indicated command.

### Commands only available with HaLo Addons extension

| Command             | Addons ver. | Comment                                                |
|---------------------|-------------|--------------------------------------------------------|
| `get_transport_pk`  | A02.03      | Only with `options.method = 'credential'` or CLI tool. |
| `load_transport_pk` | A02.03      | Only with `options.method = 'credential'` or CLI tool. |
| `export_key`        | A02.03      | Only with `options.method = 'credential'` or CLI tool. |
| `import_key`        | A02.03      | Only with `options.method = 'credential'` or CLI tool. |
| `cfg_ndef`          | A02.01      |                                                        |
| `read_ndef`         | A01.01      | Only for PCSC/React Native drivers.                    |

Addons ver. - first HaLo Addons version to officially support the indicated command.
