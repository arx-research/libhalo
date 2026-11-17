# LibHaLo Build Audit Trail

> **Note:** This article is solely about verifying where our release builds come from. If you are not concerned that much about the build process security, please feel free to skip that read.

All release assets of [arx-research/libhalo](https://github.com/arx-research/libhalo) are built by GitHub Actions workflows running on GitHub-hosted runners. For every asset, the release workflow creates a [build provenance attestation](https://docs.github.com/en/actions/security-for-github-actions/using-artifact-attestations/using-artifact-attestations-to-establish-provenance-for-builds). It is a signed statement that binds the SHA-256 digest of the file to the exact repository, workflow, git tag and commit that produced it.

## How it works

Each workflow run on a GitHub-hosted runner has a short-lived [OpenID Connect (OIDC) token](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/about-security-hardening-with-openid-connect) assigned by GitHub. The token describes the exact job that was run: repository, workflow file, git ref, commit and runner.

1. The release workflow exchanges that OIDC token for a short-lived X.509 certificate issued by [Sigstore's](https://www.sigstore.dev/) Fulcio CA. The CA copies the information from the OIDC token into the certificate.
2. The workflow ([`actions/attest-build-provenance`](https://github.com/actions/attest-build-provenance)) signs a [SLSA](https://slsa.dev/) provenance statement for each release file with that certificate.
3. The signature is recorded in Sigstore's public [Rekor](https://docs.sigstore.dev/logging/overview/) transparency log, and the attestation is stored by GitHub for this repository. You can browse them on the [Attestations](https://github.com/arx-research/libhalo/attestations) page.

No signing keys are stored anywhere; this is called "keyless signing". The release itself contains only the files you download, without any extra signature files.

## What does the attestation assert?

* The SHA-256 digest of the release file;
* The repository that built it (`arx-research/libhalo`);
* The workflow file that built it, together with the git ref (e.g. `.github/workflows/prod_build_cli.yml@refs/tags/halotools-v1.22.0`);
* The exact git commit that was built;
* That the build ran on a GitHub-hosted runner, with a link to the workflow run.

## Why does it matter?

The attestation is a proof, relying on GitHub and Sigstore (a project of the Open Source Security Foundation), that the file was produced by our automated release process and not modified afterwards. Because the commit is cryptographically bound to the file, you can review the exact source code and pipeline scripts that produced the build.

## Release assets

For each version, the following assets can be downloaded from the "Releases" sub-page of this repository:

| Release tag | Workflow | Asset |
|---|---|---|
| `halotools-v<version>` | `prod_build_cli.yml` | `halo-tools-win-x64.zip` - halocli and halo-bridge (Windows x64) |
| `halotools-v<version>` | `prod_build_cli.yml` | `halo-tools-linux-x64.tgz` - halocli and halo-bridge (Linux x64) |
| `halotools-v<version>` | `prod_build_cli.yml` | `halo-tools-macos-x64.pkg` - halocli and halo-bridge installer (Mac OS, Intel x64) |
| `halotools-v<version>` | `prod_build_cli.yml` | `halo-tools-macos-arm64.pkg` - halocli and halo-bridge installer (Mac OS, Apple Silicon) |
| `libhalo-v<version>` | `prod_build_lib.yml` | `libhalo.js` - standalone JavaScript library for classic HTML applications |
| `libhalo-v<version>` | `prod_build_lib.yml` | `libhalo.js.LICENSE.txt` - license information |

## Verifying a release asset

You will need the [GitHub CLI](https://cli.github.com/) (`gh`), logged in with `gh auth login`.

The quickest check confirms that the file was built by a workflow of this repository:

```bash
gh attestation verify halo-tools-macos-arm64.pkg --repo arx-research/libhalo
```

For a strict check, also pin the workflow, the release tag and the commit, and reject self-hosted runners. Please store the following script:

**verify.sh**
```bash
#!/usr/bin/env bash

set -e

WORKFLOW_NAME="$1"
FILE_NAME="$2"
TAG_NAME="$3"
COMMIT_HASH=$(gh api "repos/arx-research/libhalo/commits/${TAG_NAME}" --jq .sha)

gh attestation verify "${FILE_NAME}" \
    --repo arx-research/libhalo \
    --signer-workflow "arx-research/libhalo/.github/workflows/${WORKFLOW_NAME}.yml" \
    --source-ref "refs/tags/${TAG_NAME}" \
    --source-digest "${COMMIT_HASH}" \
    --deny-self-hosted-runners

echo "Commit ID: $COMMIT_HASH"
```

### Usage examples

Replace the version with the release you have downloaded.

Verify the Apple Silicon installer of version `halotools-v1.22.0`:
```bash
./verify.sh prod_build_cli halo-tools-macos-arm64.pkg halotools-v1.22.0
```

Verify `libhalo.js` of version `libhalo-v1.22.0`:
```bash
./verify.sh prod_build_lib libhalo.js libhalo-v1.22.0
```

### Offline verification

The attestation can be downloaded once and verified later without access to the GitHub attestation API:

```bash
# writes sha256:<digest>.jsonl to the current directory
gh attestation download halo-tools-macos-arm64.pkg --repo arx-research/libhalo
gh attestation verify halo-tools-macos-arm64.pkg --repo arx-research/libhalo --bundle sha256:<digest>.jsonl
```

## NPM package

The `@arx-research/libhalo` package is published to [npmjs.com](https://www.npmjs.com/package/@arx-research/libhalo) by the `prod_build_lib.yml` workflow with [npm provenance](https://docs.npmjs.com/generating-provenance-statements). The package versions correspond to the `libhalo-v<version>` releases of this repository.

The provenance is shown on the package page on npmjs.com and links to the exact commit and workflow run. To verify the registry signatures and provenance of the packages installed in your project:

```bash
npm audit signatures
```

## Older releases

Build provenance attestations are available starting with `halotools-v1.22.0` and `libhalo-v1.22.0`. Earlier releases (including `v1.22.0a`) ship two additional files per asset instead, signed with [`cosign`](https://docs.sigstore.dev/cosign/installation/):

* `<asset name>-keyless.pem` - the ephemeral certificate;
* `<asset name>-keyless.sig` - the signature made with that certificate.

Older `libhalo-v*` releases also contain `libhalo-npm-hash.txt`, the SHA-512 integrity hash of the published NPM package, signed the same way.

These files can be verified with the following script:

**verify-legacy.sh**
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

Example:
```bash
./verify-legacy.sh prod_build_cli halo-tools-win-x64.zip halotools-v1.21.0
```
