# LibHaLo Build Audit Trail

> **Note:** This article is solely about verifying additional build signatures. If you are not concerned that much about the build process security, please feel free to skip that read.

Each workflow that gets executed on a GitHub-hosted runner has a short-lived [OpenID Connect (OIDC) token](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/about-security-hardening-with-openid-connect) assigned by GitHub.
This token contains essential information about the exact job that was run (commit identifier, git tag, name of the workflow, and other).

During the build process, we are using the tool which validates that OIDC token against the [Fulcio CA](https://www.chainguard.dev/unchained/a-fulcio-deep-dive).
In turn, the CA is issuing an ephemeral X.509 certificate. Practically, the CA is just rewriting the information from the original OIDC token into the newly issued certificate.

Finally, we use that ephemeral certificates in order to additionally sign all release assets that are contained in the [arx-research/libhalo](https://github.com/arx-research/libhalo) repository. This technique is so-called as ["keyless signing"](https://www.chainguard.dev/unchained/zero-friction-keyless-signing-with-github-actions), and the exact tool that we are using is `cosign` (a part of "sigstore" project by The Linux Foundation).

## What does ephemeral certificate contain?

The ephemeral X.509 certificate has the following information asserted by the Fulcio CA:

* The base URL of the OIDC token, so that you can verify that the original OIDC token really came from GitHub-hosted runner (OID: `1.3.6.1.4.1.57264.1.1`);
* Name of the GitHub repository (OID: `1.3.6.1.4.1.57264.1.5`);
* The URL of the exact GitHub Actions workflow file that produced the artifact, together with the target tag name (X509v3 Subject Alternative Name);
* Exact git commit hash for which the build was triggered (OID: `1.3.6.1.4.1.57264.1.3`);

Please note that the above list is not exhaustive, but we have listed the most essential components.

## Why does it matter?

Signatures made with ephemeral certificates consistute a proof of trust, which relies on GitHub and Fulcio CA (run by The Linux Foundation)
that the build was produced by the automated process. Moreover, the real commit ID is cryptographically associated with 
the produced release assets, so you are able to review the accurate code snapshot and all the pipeline scripts as they were
at the moment when the build was created. Thus, the builds are more reliable.

## File asset signatures

For each version, the build process will produce the following release assets, which could be downloaded
using the "Releases" sub-page of this repository:

* `halocli-x64-win.zip` - HaLo Command Line Interface Tool (Windows x64)
* `halocli-x64-linux.zip` - HaLo Command Line Interface Tool (Linux x64)
* `halocli-x64-macos.pkg` - HaLo Command Line Interface Tool (Mac OS x64)
* `libhalo.js` - standalone JavaScript library for usage with classic HTML applications;

Each of these assets is accompanied by the signature and certificate files in the format:

* `<asset name>-keyless.pem` - the ephemeral certificate produced by `cosign` tool;
* `<asset name>-keyless.sig` - the signature made with that ephemeral certificate;

## NPM package signatures

* `@arx-research/libhalo` package on npmjs.com
* `@arx-research/libhalo` package on GitHub Packages

The published package semantic versions correspond to the releases marked `libhalo-v<semver>` on the "Releases" sub-page of this GitHub repository.
Each corresponding release contains `libhalo-npm-hash.txt` file, which is an integrity hash (SHA512) of the published NPM package. This file also contains corresponding
signature made with `cosign`:

* `libhalo-npm-hash.txt-keyless.pem` - the ephemeral certificate for the hash file;
* `libhalo-npm-hash.txt-keyless.sig` - the signature made with that ephemeral certificate;

## Verification script
In order to verify the keyless signatures, you will need to [install cosign tool](https://docs.sigstore.dev/cosign/installation/).

Please store the following example bash script:

**verify.sh**
```bash
#!/usr/bin/env bash

set -e

WORKFLOW_NAME="$1"
BIN_NAME="$2"
TAG_NAME="$3"
COMMIT_HASH=$(curl -s "https://api.github.com/repos/arx-research/libhalo/git/ref/tags/${TAG_NAME}" | jq --raw-output .object.sha)

cosign verify-blob \
    --signature "${BIN_NAME}-keyless.sig" \
    --certificate "${BIN_NAME}-keyless.pem" \
    --certificate-identity "https://github.com/arx-research/libhalo/.github/workflows/${WORKFLOW_NAME}.yml@refs/tags/${TAG_NAME}" \
    --certificate-oidc-issuer https://token.actions.githubusercontent.com \
    --certificate-github-workflow-sha "$COMMIT_HASH" \
    "${BIN_NAME}"

echo "Commit ID: $COMMIT_HASH"
```

### Usage examples
Verify `halocli-win-x64.zip` build against the automated build of version `halocli-v1.1.1`:
```
./verify.sh prod_build_cli halocli-win-x64.zip halocli-v1.1.1
```

Verify `libhalo.js` build against the automated build of version `libhalo-v1.1.1`:
```
./verify.sh prod_build_lib libhalo.js libhalo-v1.1.1
```

Verify the published NPM package hash against the automated build of version `libhalo-v1.1.1`:
```
# (1) get the integrity hash of your installed version
npm view @arx-research/libhalo | grep integrity
# (2) verify the hash file from "Releases" sub-page
./verify.sh prod_build_lib libhalo-npm-hash.txt libhalo-v1.1.1
# (3) compare if `libhalo-npm-hash.txt` is the same as (1)
cat libhalo-npm-hash.txt
```
