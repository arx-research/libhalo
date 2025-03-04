import {
    Address,
    encodeFunctionData,
    encodePacked,
    getContractAddress,
    Hex,
    hexToBigInt,
    keccak256,
    zeroAddress,
    zeroHash,
} from 'viem'
import {SafeAbi} from './safe_abi.js'
import {
    FALLBACK_HANDLER,
    SAFE4337_MODULE_ADDRESS,
    SAFE_PROXY_CREATION_CODE,
    SAFE_PROXY_FACTORY_ADDRESS,
    SAFE_SINGLETON_ADDRESS,
    SETUP_CONTRACT_ADDRESS
} from "./cometh_config.js";


const _EnableModuleAbi = [
    {
        inputs: [
            {internalType: "address[]", name: "modules", type: "address[]"},
        ],
        name: "enableModules",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
] as const;


const _getSetUpCallData = ({
                               modules
                           }: {
    modules: Address[];
}) => {
    return encodeFunctionData({
        abi: _EnableModuleAbi,
        functionName: "enableModules",
        args: [modules],
    })
}

const _getSafeSetUpData = ({
                               owner,
                               threshold,
                               setUpContractAddress,
                               setUpData,
                               fallbackHandler,
                           }: {
    owner: Address;
    threshold: number;
    setUpContractAddress: Address;
    setUpData: Hex;
    fallbackHandler: Address;
}): Hex => {
    return encodeFunctionData({
        abi: SafeAbi,
        functionName: "setup",
        args: [
            [owner],
            threshold,
            setUpContractAddress,
            setUpData,
            fallbackHandler,
            zeroAddress,
            0,
            zeroAddress,
        ],
    })
}

const _getSafeInitializer = ({
                                 eoaAddress,
                                 threshold,
                                 fallbackHandler,
                                 modules,
                                 setUpContractAddress,
                             }: {
    eoaAddress: Address;
    threshold: number;
    fallbackHandler: Address;
    modules: Address[];
    setUpContractAddress: Address;
}): Hex => {
    const setUpCallData = _getSetUpCallData({
        modules
    })

    return _getSafeSetUpData({
        owner: eoaAddress,
        threshold,
        setUpContractAddress,
        setUpData: setUpCallData,
        fallbackHandler,
    })
}

const _getSafeAddressFromInitializer = async ({
                                                  safeProxyFactoryAddress,
                                                  safeSingletonAddress,
                                                  initializer,
                                                  saltNonce,
                                              }: {
    safeProxyFactoryAddress: Address;
    safeSingletonAddress: Address;
    initializer: Hex;
    saltNonce: bigint;
}) => {
    const deploymentCode = encodePacked(
        ["bytes", "uint256"],
        [SAFE_PROXY_CREATION_CODE, hexToBigInt(safeSingletonAddress)]
    )

    const salt = keccak256(
        encodePacked(
            ["bytes32", "uint256"],
            [keccak256(encodePacked(["bytes"], [initializer])), saltNonce]
        )
    )

    return getContractAddress({
        bytecode: deploymentCode,
        from: safeProxyFactoryAddress,
        opcode: "CREATE2",
        salt,
    })
}

export default async function computeGiftcardAddress(eoaAddress: Address) {
    const initializer = _getSafeInitializer({
        eoaAddress,
        threshold: 1,
        fallbackHandler: FALLBACK_HANDLER,
        modules: [SAFE4337_MODULE_ADDRESS],
        setUpContractAddress: SETUP_CONTRACT_ADDRESS,
    })

    return await _getSafeAddressFromInitializer({
        safeSingletonAddress: SAFE_SINGLETON_ADDRESS,
        safeProxyFactoryAddress: SAFE_PROXY_FACTORY_ADDRESS,
        saltNonce: hexToBigInt(zeroHash),
        initializer,
    })
}
