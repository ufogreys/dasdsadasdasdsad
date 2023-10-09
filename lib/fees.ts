import { SwapFormValues } from "../components/DTOs/SwapFormValues";
import { roundDecimals, truncateDecimals } from "../components/utils/RoundDecimals";
import upperCaseKeys from "../components/utils/upperCaseKeys";
import { GetDefaultAsset, GetDefaultNetwork, GetNetworkCurrency } from "../helpers/settingsHelper";
import { CryptoNetwork, NetworkType } from "../Models/CryptoNetwork";
import { Currency } from "../Models/Currency";
import { Layer } from "../Models/Layer";
import KnownInternalNames from "./knownIds";

export function GetExchangeFee(asset?: string, layer?: Layer): number {
    if (!layer?.isExchange)
        return 0
    return layer?.assets?.find(ec => ec.asset === asset)?.withdrawal_fee || 0
}
export function CalculateMinimalAuthorizeAmount(usd_price: number, amount: number) {
    return Math.ceil((usd_price * amount) + (usd_price * amount * 0.02))
}

export function CaluclateRefuelAmount(
    values: SwapFormValues,
    allCurrencies: Currency[]): {
        refuelAmountInSelectedCurrency: number,
        refuelAmountInNativeCurrency: number
    } {
    const { currency, to, refuel: refuelEnabled } = values || {}

    if (!currency || !to || !refuelEnabled)
        return { refuelAmountInSelectedCurrency: 0, refuelAmountInNativeCurrency: 0 }
    const destinationLayer = to
    const destinationNetwork = GetDefaultNetwork(destinationLayer, currency?.asset)

    const destinationNetworkCurrency = GetNetworkCurrency(destinationLayer, currency?.asset)
    const destinationNetworkNativeAsset = allCurrencies?.find(c => c.asset == destinationNetwork?.native_currency);

    if (!destinationNetworkCurrency || !destinationNetworkNativeAsset)
        return { refuelAmountInSelectedCurrency: 0, refuelAmountInNativeCurrency: 0 }

    let refuelAmountInSelectedCurrency = 0;
    let refuelAmountInNativeCurrency = 0;

    if (!destinationLayer?.isExchange && destinationNetworkCurrency.is_refuel_enabled && destinationNetwork.refuel_amount_in_usd > 0 && currency.usd_price > 0 && destinationNetworkNativeAsset.usd_price > 0) {
        refuelAmountInSelectedCurrency += destinationNetwork.refuel_amount_in_usd / currency.usd_price;
        refuelAmountInNativeCurrency += destinationNetwork.refuel_amount_in_usd / destinationNetworkNativeAsset.usd_price;
    }

    return { refuelAmountInSelectedCurrency, refuelAmountInNativeCurrency };
}

export function CanDoSweeplessTransfer(sourceLayer: Layer, sourceAddress?: string, destinationAddress?: string): boolean {
    if (sourceLayer?.isExchange == false
        && ([NetworkType.EVM, NetworkType.Starknet].includes(sourceLayer.type) || sourceAddress?.toLowerCase() === destinationAddress?.toLowerCase())
    ) {
        return true;
    }

    return false;
}

export function CalculateFee(values: SwapFormValues, allNetworks: CryptoNetwork[]): number {
    const { currency, from, to } = values || {}

    if (!currency || !from || !to)
        return 0;

    const sourceLayer = from
    const destinationLayer = to
    const destinationNetworkCurrency = GetNetworkCurrency(destinationLayer, currency?.asset)
    const sourceNetworkCurrency = GetNetworkCurrency(sourceLayer, currency?.asset)
    if (!destinationNetworkCurrency || !sourceNetworkCurrency)
        return 0

    let baseFee = (sourceNetworkCurrency?.source_base_fee + destinationNetworkCurrency?.destination_base_fee)
    let withdrawalFee = destinationNetworkCurrency.withdrawal_fee
    let depoistFee = sourceNetworkCurrency.deposit_fee;
    if (CanDoSweeplessTransfer(sourceLayer))
        depoistFee = 0


    return (withdrawalFee + depoistFee + baseFee);
}

export function CalculateReceiveAmount(values: SwapFormValues, allNetworks: CryptoNetwork[], allCurrencies: Currency[]) {

    const amount = Number(values?.amount)
    if (!amount) return 0;

    let minAllowedAmount = CalculateMinAllowedAmount(values, allNetworks, allCurrencies);

    if (amount >= minAllowedAmount) {
        let fee = CalculateFee(values, allNetworks);
        const { refuelAmountInSelectedCurrency } = CaluclateRefuelAmount(values, allCurrencies)
        var result = amount - fee - refuelAmountInSelectedCurrency;
        const sourceLayer = values?.from

        if (sourceLayer?.isExchange && sourceLayer?.authorization_flow == "o_auth2") {
            let exchangeFee = GetExchangeFee(values.currency?.asset, values.from);
            result -= exchangeFee;
        }

        return Number(result.toFixed(values.currency?.precision));
    }

    return 0;
}

export function CalculateMaxAllowedAmount(values: SwapFormValues, balances?: string, walletBalance?: number, gas?: number, minAllowedAmount?: number) {
    const { currency, from, to } = values || {}

    if (!currency || !from || !to) return 0
    const destinationNetworkCurrency = GetNetworkCurrency(to, currency?.asset)
    let maxAmount = destinationNetworkCurrency?.max_withdrawal_amount || 0

    if (balances) {
        try {
            let balancesTyped = upperCaseKeys(JSON.parse(balances))
            if (balancesTyped && balancesTyped[currency.asset] && balancesTyped[currency.asset] > minAllowedAmount) {
                maxAmount = Math.min(maxAmount, balancesTyped[currency.asset]);
            }
        }
        // in case the query parameter had bad formatting just ignoe
        catch { }
    } else if (walletBalance && (walletBalance >= minAllowedAmount && walletBalance <= maxAmount)) {
        return walletBalance - gas
    }
    return maxAmount || 0
}

export function CalculateMinAllowedAmount(values: SwapFormValues, allNetworks: CryptoNetwork[], allCurrencies: Currency[]) {

    const { currency, from, to } = values || {}
    if (!currency || !from || !to) return 0
    const sourceLayer = from
    const destinationLayer = to
    const asset = currency?.asset

    let minAmount = CalculateFee(values, allNetworks)
    if (from.internal_name === KnownInternalNames.Exchanges.Coinbase
        && sourceLayer.isExchange) {
        const exchangeAsset = GetDefaultAsset(sourceLayer, asset)
        minAmount += exchangeAsset?.withdrawal_fee || 0
    }
    if (destinationLayer?.isExchange) {
        const destinationNetworkCurrency = GetDefaultAsset(destinationLayer, asset)
        if (destinationNetworkCurrency?.min_deposit_amount > 0)
            minAmount += destinationNetworkCurrency?.min_deposit_amount
    }
    const destinationNetworkCurrency = GetNetworkCurrency(destinationLayer, asset)
    const sourceNetworkCurrency = GetNetworkCurrency(sourceLayer, asset)

    const { refuelAmountInSelectedCurrency } = CaluclateRefuelAmount(values, allCurrencies);
    minAmount += (sourceNetworkCurrency?.source_base_fee + destinationNetworkCurrency?.destination_base_fee) + refuelAmountInSelectedCurrency

    return roundDecimals(minAmount * 1.2, currency?.usd_price?.toFixed()?.length) || 0
}