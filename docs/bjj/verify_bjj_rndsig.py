"""
 * An example script demonstrating how to verify BJJ dynamic URL signature on slot 0x62
 * HALO ETH - Core layer
 * Copyright (C) 2022-2024 Arx Research Inc.
"""

import argparse
import binascii
import struct
import sys
from hashlib import sha256
from typing import Tuple

# ecdsa==0.18.0
from ecdsa import VerifyingKey, ellipticcurve, BadSignatureError
from ecdsa.util import sigdecode_der, sigencode_der
from ecdsa.curves import Curve


def verify_rndsig(pkn: bytes, rnd: bytes, rndsig: bytes) -> Tuple[bytes, int]:
    # BJJ Curve Parameters
    _a = 0x10216f7ba065e00de81ac1e7808072c9b8114d6d7de87adb16a0a72f1a91f6a0
    _b = 0x23d885f647fed5743cad3d1ee4aba9c043b4ac0fc2766658a410efdeb21f706e
    _p = 0x30644e72e131a029b85045b68181585d2833e84879b9709143e1f593f0000001
    _Gx = 0x1fde0a3cac7cb46b36c79f4c0a7a732e38c2c7ee9ac41f44392a07b748a0869f
    _Gy = 0x203a710160811d5c07ebaeb8fe1d9ce201c66b970d66f18d0d2b264c195309aa
    _r = 0x060c89ce5c263405370a08b6d0302b0bab3eedb83920ee0a677297dc392126f1

    curve_babyjubjub = ellipticcurve.CurveFp(_p, _a, _b, 1)
    generator_babyjubjub = ellipticcurve.PointJacobi(
        curve_babyjubjub, _Gx, _Gy, 1, _r, generator=True
    )

    BabyJubJub = Curve(
        "BabyJubJub",
        curve_babyjubjub,
        generator_babyjubjub,
        (2, 999, 1, 2, 3, 4),
        None,
    )

    # remove unnecessary null bytes at the end of the signature
    rndsig_len = 2 + rndsig[1]
    rndsig_stripped = rndsig[0:rndsig_len]

    # correct the signature in order to dodge a bug in JCOP 4
    (r, s) = sigdecode_der(rndsig_stripped, order=_r)
    r = r % _r
    rndsig_stripped = sigencode_der(r, s, order=_r)

    # extract public key from the pkN=... field
    public_key = pkn[2:]

    # perform the actual verification
    rnd_prefixed = b'\x19Attest counter pk62:\n' + rnd

    vk = VerifyingKey.from_string(public_key, curve=BabyJubJub)
    vk.verify(rndsig_stripped, rnd_prefixed, sigdecode=sigdecode_der, allow_truncate=True, hashfunc=sha256)

    # parse the counter value
    counter_value = struct.unpack(">I", rnd[0:4])[0]

    return public_key, counter_value


if __name__ == "__main__":
    """
    Example usage:
    
    $ pip3 install ecdsa==0.18.0
    
    $ python3 verify_bjj_fixsig.py --pkn 62000416FFE77D0F9044B209663A96F1FDF8C41A4C75212F520B1013C64F3AD0193FD7118EB2A50D78520DE66B1D3F89048B7189FCAC8B1B3B5C21834A1E87916D8303 --rnd 000005443E81D2B4E37955C50CA0E4C580B8EEEE2319B090D5D516D74C357FB7 --rndsig 304402201F595063ABCC72A8EAA60621A30B9AD2DF77F5D6BEF704435B3DD508CE27A0CA02200426D2E5E9590E46130A034AE47A8A6C12BB3FC770C68A3C1AC49BC302DF0CF70000
    $ python3 verify_bjj_fixsig.py --pkn 62000416FFE77D0F9044B209663A96F1FDF8C41A4C75212F520B1013C64F3AD0193FD7118EB2A50D78520DE66B1D3F89048B7189FCAC8B1B3B5C21834A1E87916D8303 --rnd 00000545E2940108C99C7B92B4D6D411835863C943007F14564A38326FEC4415 --rndsig 3044022008A6A5F0AEC049E8A99A52B675E12843D53495E676B50E08942C8D679C3F79BE0220023D5AEE66BDBF2F577CA1C46914F104B33D6E8D512D660BF0B82A2A99C278420000
    $ python3 verify_bjj_fixsig.py --pkn 62000416FFE77D0F9044B209663A96F1FDF8C41A4C75212F520B1013C64F3AD0193FD7118EB2A50D78520DE66B1D3F89048B7189FCAC8B1B3B5C21834A1E87916D8303 --rnd 000005490DEE4E738210E393E3A9E9D292976CAA1915663F82A75415CA765A97 --rndsig 304402200B49B3FE4B80947D99272192812BE9E4F60232C1BCBBFA26DEDCFA80DCD4B24F0220026AF01F3D324F5006C70B8974AAE12E7CFB73CFE8EFEDE53DD019CE3D93ED8E0000
    """

    parser = argparse.ArgumentParser(description='HaLo BJJ Dynamic URL Example')
    parser.add_argument('--pkn', help='Value of the \'pkN\' query string parameter.', required=True)
    parser.add_argument('--rnd', help='Value of the \'rnd\' query string parameter.', required=True)
    parser.add_argument('--rndsig', help='Value of the \'rndsig\' query string parameter.', required=True)

    args = parser.parse_args()

    try:
        public_key, counter_value = verify_rndsig(
            pkn=binascii.unhexlify(args.pkn),
            rnd=binascii.unhexlify(args.rnd),
            rndsig=binascii.unhexlify(args.rndsig))
    except BadSignatureError:
        print('FAIL')
        sys.exit(1)

    print(f'PASS counter={counter_value}; public_key={public_key.hex()}')
