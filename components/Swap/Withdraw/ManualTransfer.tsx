import { FC, useCallback, useState } from "react"
import useSWR from "swr"
import QRCode from "qrcode.react"
import colors from 'tailwindcss/colors';
import { AlignLeft, ArrowLeftRight, Megaphone } from "lucide-react"
import Image from 'next/image';
import { ApiResponse } from "../../../Models/ApiResponse";
import { useSettingsState } from "../../../context/settings";
import { useSwapDataState, useSwapDataUpdate } from "../../../context/swap";
import KnownInternalNames from "../../../lib/knownIds";
import BackgroundField from "../../backgroundField";
import LayerSwapApiClient, { DepositAddress, DepositAddressSource, DepositType, Fee } from "../../../lib/layerSwapApiClient";
import SubmitButton from "../../buttons/submitButton";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "../../shadcn/select";
import { BaseL2Asset } from "../../../Models/Layer";
import SpinIcon from "../../icons/spinIcon";

const ManualTransfer: FC = () => {
    const { swap } = useSwapDataState()
    const [messageClicked, setMessageClicked] = useState(false)

    const {
        source_network: source_network_internal_name } = swap

    const layerswapApiClient = new LayerSwapApiClient()
    const {
        data: generatedDeposit,
        isLoading
    } = useSWR<ApiResponse<DepositAddress>>(`/deposit_addresses/${source_network_internal_name}?source=${DepositAddressSource.UserGenerated}`,
        layerswapApiClient.fetcher,
        {
            dedupingInterval: 60000,
            shouldRetryOnError: false
        }
    )

    let generatedDepositAddress = generatedDeposit?.data?.address
    let shouldGenerateAddress = !generatedDepositAddress && messageClicked

    const handleCloseNote = useCallback(async () => {
        setMessageClicked(true)
    }, [])

    if (isLoading) {
        return <div className='flex justify-center'>
            <AlignLeft className='w-36 h-36 text-[#141c31]' />
        </div>
    }

    return (
        !(generatedDepositAddress || messageClicked) ?
            <div className="rounded-lg p-4 flex flex-col items-center text-center bg-secondary-700 border border-secondary-500 gap-5">
                <Megaphone className="h-10 w-10 text-secondary-text" />
                <div className="max-w-xs">
                    <h3 className="text-lg text-primary-text">
                        About manual transfers
                    </h3>
                    <p className="text-sm">
                        Transfer assets to Layerswap’s deposit address to complete the swap.
                    </p>
                </div>
                <SubmitButton isDisabled={false} isSubmitting={false} onClick={handleCloseNote}>
                    Got it
                </SubmitButton>
            </div>
            :
            <TransferInvoice address={generatedDepositAddress} shouldGenerateAddress={shouldGenerateAddress} />
    )

}

const TransferInvoice: FC<{ address?: string, shouldGenerateAddress: boolean }> = ({ address: existingDepositAddress, shouldGenerateAddress }) => {

    const { layers, resolveImgSrc } = useSettingsState()
    const { swap, selectedAssetNetwork } = useSwapDataState()
    const { setSelectedAssetNetwork } = useSwapDataUpdate()
    const {
        source_network: source_network_internal_name,
        source_exchange: source_exchange_internal_name,
        destination_network: destination_network_internal_name,
        destination_network_asset,
        source_network_asset
    } = swap

    const source_network = layers.find(n => n.internal_name === source_network_internal_name)

    const source_exchange = layers.find(n => n.internal_name === source_exchange_internal_name)

    const asset = source_network?.assets?.find(currency => currency?.asset === destination_network_asset)

    const layerswapApiClient = new LayerSwapApiClient()
    const generateDepositParams = shouldGenerateAddress ? [selectedAssetNetwork?.network_internal_name ?? null] : null

    const {
        data: generatedDeposit
    } = useSWR<ApiResponse<DepositAddress>>(generateDepositParams, ([network]) => layerswapApiClient.GenerateDepositAddress(network), { dedupingInterval: 60000 })

    const feeParams = {
        source: selectedAssetNetwork?.network?.internal_name,
        destination: destination_network_internal_name,
        source_asset: source_network_asset,
        destination_asset: destination_network_asset,
        refuel: swap?.has_refuel
    }

    const { data: feeData } = useSWR<ApiResponse<Fee[]>>([feeParams], ([params]) => layerswapApiClient.GetFee(params), { dedupingInterval: 60000 })
    const manualTransferFee = feeData?.data?.find(f => f?.deposit_type === DepositType.Manual)


    const requested_amount = manualTransferFee?.min_amount > swap?.requested_amount ? manualTransferFee?.min_amount : swap?.requested_amount
    const depositAddress = existingDepositAddress || generatedDeposit?.data?.address

    const handleChangeSelectedNetwork = useCallback((n: BaseL2Asset) => {
        setSelectedAssetNetwork(n)
    }, [])

    return <div className='rounded-md bg-secondary-700 border border-secondary-500 divide-y divide-secondary-500'>
        <div className={`w-full relative rounded-md px-3 py-3 shadow-sm border-secondary-700 border bg-secondary-700 flex flex-col items-center justify-center gap-2`}>
            {
                source_exchange &&
                <ExchangeNetworkPicker onChange={handleChangeSelectedNetwork} />
            }
            <div className='p-2 bg-primary-text/30 bg-opacity-30 rounded-xl'>
                <div className='p-2 bg-primary-text/70 bg-opacity-70 rounded-lg'>
                    {depositAddress ? <QRCode
                        className="p-2 bg-primary-text rounded-md"
                        value={depositAddress}
                        size={120}
                        bgColor={colors.white}
                        fgColor="#000000"
                        level={"H"}
                    />
                        :
                        <div className="relative h-[120px] w-[120px]">
                            <div className="absolute top-[calc(50%-10px)] left-[calc(50%-10px)]">
                                <SpinIcon className="animate-spin h-5 w-5 text-secondary-500" />
                            </div>
                        </div>
                    }
                </div>
            </div>
        </div>
        {
            (source_network_internal_name === KnownInternalNames.Networks.LoopringMainnet || source_network_internal_name === KnownInternalNames.Networks.LoopringGoerli) &&
            <BackgroundField header={'Send type'} withoutBorder>
                <div className='flex items-center space-x-2'>
                    <ArrowLeftRight className='h-4 w-4' />
                    <p>
                        To Another Loopring L2 Account
                    </p>
                </div>
            </BackgroundField>
        }
        <BackgroundField Copiable={true} toCopy={depositAddress} header={'Deposit Address'} withoutBorder>
            <div>
                {
                    depositAddress ?
                        <p className='break-all text-primary-text'>
                            {depositAddress}
                        </p>
                        :
                        <div className='bg-gray-500 w-56 h-5 animate-pulse rounded-md' />
                }
                {
                    (source_network_internal_name === KnownInternalNames.Networks.LoopringMainnet || source_network_internal_name === KnownInternalNames.Networks.LoopringGoerli) &&
                    <div className='flex text-xs items-center px-2 py-1 mt-1 border-2 border-secondary-100 rounded border-dashed'>
                        <p>
                            You might get a warning that this is not an activated address. You can ignore it.
                        </p>
                    </div>
                }
            </div>
        </BackgroundField>
        {
            (source_network_internal_name === KnownInternalNames.Networks.LoopringGoerli || source_network_internal_name === KnownInternalNames.Networks.LoopringMainnet) &&
            <div className='flex space-x-4'>
                <BackgroundField header={'Address Type'} withoutBorder>
                    <p>
                        EOA Wallet
                    </p>
                </BackgroundField>
            </div>
        }
        <div className='flex divide-x divide-secondary-500'>
            <BackgroundField Copiable={true} toCopy={requested_amount} header={'Amount'} withoutBorder>
                <p>
                    {requested_amount}
                </p>
            </BackgroundField>
            <BackgroundField header={'Asset'} withoutBorder>
                <div className="flex items-center">
                    <div className="flex-shrink-0 h-5 w-5 relative">
                        {
                            asset &&
                            <Image
                                src={resolveImgSrc({ asset: asset?.asset })}
                                alt="From Logo"
                                height="60"
                                width="60"
                                className="rounded-md object-contain"
                            />
                        }
                    </div>
                    <div className="mx-1 block">{asset?.asset}</div>
                </div>
            </BackgroundField>
        </div>
    </div>
}

const ExchangeNetworkPicker: FC<{ onChange: (network: BaseL2Asset) => void }> = ({ onChange }) => {
    const { layers, resolveImgSrc } = useSettingsState()
    const { swap } = useSwapDataState()
    const {
        source_exchange: source_exchange_internal_name,
        destination_network,
        source_network_asset } = swap
    const source_exchange = layers.find(n => n.internal_name === source_exchange_internal_name)

    const exchangeAssets = source_exchange.assets.filter(a => a.asset === source_network_asset && a.network_internal_name !== destination_network && a.network.status !== "inactive")
    const defaultSourceNetwork = exchangeAssets.find(sn => sn.is_default) || exchangeAssets?.[0]

    const handleChangeSelectedNetwork = useCallback((n: string) => {
        const network = exchangeAssets.find(network => network?.network_internal_name === n)
        onChange(network)
    }, [exchangeAssets])

    return <div className='flex items-center gap-1 text-sm my-2'>
        <span>Network:</span>
        {exchangeAssets?.length === 1 ?
            <div className='flex space-x-1 items-center w-fit font-semibold text-primary-text'>
                <Image alt="chainLogo" height='20' width='20' className='h-5 w-5 rounded-md ring-2 ring-secondary-600' src={resolveImgSrc(exchangeAssets?.[0])}></Image>
                <span>{defaultSourceNetwork?.network?.display_name}</span>
            </div>
            :
            <Select onValueChange={handleChangeSelectedNetwork} defaultValue={defaultSourceNetwork?.network_internal_name}>
                <SelectTrigger className="w-fit border-none !text-primary-text !font-semibold !h-fit !p-0">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectGroup>
                        <SelectLabel>Networks</SelectLabel>
                        {exchangeAssets.map(sn => (
                            <SelectItem key={sn.network_internal_name} value={sn.network_internal_name}>
                                <div className="flex items-center">
                                    <div className="flex-shrink-0 h-5 w-5 relative">
                                        {
                                            sn &&
                                            <Image
                                                src={resolveImgSrc(sn.network)}
                                                alt="From Logo"
                                                height="60"
                                                width="60"
                                                className="rounded-md object-contain"
                                            />
                                        }
                                    </div>
                                    <div className="mx-1 block">{sn?.network?.display_name}</div>
                                </div>
                            </SelectItem>
                        ))}
                    </SelectGroup>
                </SelectContent>
            </Select>
        }
    </div>
}


export default ManualTransfer