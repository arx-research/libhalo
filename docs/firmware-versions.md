# HaLo Tag Firmware Versions

## Identifying your HaLo Firmware version

### By checking it using CLI
The following CLI command will reveal the HaLo firmware version for any tag:

```
./halo-cli version
```

### By scanning the dynamic URL
In order to check your HaLo Firmware version, please scan your NFC tag in order to obtain
the sample of the generated dynamic URL.

The tag should contain the `?v=` query string parameter in the format:
```
<<MajorVersion>>.<<Minor Version>>.<<Sequential number>>.<<Unique ID>>
```

If it does, then your tag's firmware version is exactly the version indicated in the `?v=` query string parameter.

There are a few exceptions for the earliest batches of HaLo tags:

* The tag doesn't contain `v=` query string parameter: the firmware version is `01.C1.000001.00000000`.
* The tag contains `v=c2` query string parameter: the firmware version is `01.C2.000002.00000000`.
* The tag contains `v=c3` query string parameter: the firmware version is `01.C3.000003.00000000`.

## Feature compatibility table

| Command           | Minimal version | Comment                                       |
|-------------------|-----------------|-----------------------------------------------|
| `sign`            | 01.C1           | Only with `command.legacySignCommand = true`. |
| `sign`            | 01.C4           | All combinations of arguments.                |
| `sign_random`     | 01.C4           |                                               |
| `write_latch`     | 01.C3           |                                               |
| `cfg_ndef`        | 01.C4           |                                               |
| `gen_key`         | 01.C3           | Only without `command.entropy` argument.      |
| `gen_key`         | 01.C4           | All combinations of arguments.                |
| `gen_key_confirm` | 01.C4           |                                               |
