import { FC, useCallback, useState } from 'react'
import SubmitButton from '../../../buttons/submitButton';
import Modal from '../../../modal/modal';
import Authorize from './Authorize';
import Coinbase2FA from './Coinbase2FA';
import { ArrowLeftRight, Link } from 'lucide-react';
import { useSwapDataState, useSwapDataUpdate } from '../../../../context/swap';
import LayerSwapApiClient, { PublishedSwapTransactionStatus } from '../../../../lib/layerSwapApiClient';
import { KnownErrorCode } from '../../../../Models/ApiError';
import toast from 'react-hot-toast';
import { useSettingsState } from '../../../../context/settings';
import { TimerProvider, useTimerState } from '../../../../context/timerContext';
const TIMER_SECONDS = 120

const Coinbase: FC = () => {
    return <TimerProvider>
        <TransferElements />
    </TimerProvider>
}

const TransferElements: FC = () => {
    const { swap, codeRequested } = useSwapDataState()
    const { setCodeRequested, setSwapPublishedTx, mutateSwap } = useSwapDataUpdate()
    const { networks } = useSettingsState()
    const {
        destination_network: destination_network_internal_name,
    } = swap
    const { start: startTimer } = useTimerState()

    const [showCoinbaseConnectModal, setShowCoinbaseConnectModal] = useState(false)
    const [openCoinbase2FA, setOpenCoinbase2FA] = useState(false)

    const [loading, setLoading] = useState(false)

    const destination_network = networks.find(n => n.internal_name === destination_network_internal_name)

    const handleTransfer = useCallback(async () => {
        setLoading(true)
        if (codeRequested)
            setOpenCoinbase2FA(true)
        else {
            try {
                const layerswapApiClient = new LayerSwapApiClient()
                await layerswapApiClient.WithdrawFromExchange(swap.id, swap.source_exchange)
            }
            catch (e) {
                if (e?.response?.data?.error?.code === KnownErrorCode.COINBASE_INVALID_2FA) {
                    startTimer(TIMER_SECONDS)
                    setCodeRequested(true)
                    setOpenCoinbase2FA(true)
                }
                else if (e?.response?.data?.error?.code === KnownErrorCode.INVALID_CREDENTIALS || e?.response?.data?.error?.code === KnownErrorCode.COINBASE_AUTHORIZATION_LIMIT_EXCEEDED) {
                    setCodeRequested(false)
                    alert("You have not authorized enough to be able to complete the transfer. Please authorize again.")
                }
                else if (e?.response?.data?.error?.message) {
                    toast(e?.response?.data?.error?.message)
                }
                else if (e?.message)
                    toast(e.message)
            }
        }
        setLoading(false)
    }, [swap, destination_network, codeRequested])

    const openConnect = () => {
        setShowCoinbaseConnectModal(true)
    }

    const handleSuccess = useCallback(async (swapId: string) => {
        setOpenCoinbase2FA(false)
        setSwapPublishedTx(swapId, PublishedSwapTransactionStatus.Completed, "_")
    }, [])

    const handleAuthorized = async () => {
        setLoading(true);
        setShowCoinbaseConnectModal(false)
        await mutateSwap()
        setLoading(false);
    }

    return (
        <>
            <Modal height='full'
                show={showCoinbaseConnectModal}
                setShow={setShowCoinbaseConnectModal}
                header={`Connect your Coinbase account`}
            >
                <Authorize
                    hideHeader
                    onDoNotConnect={() => setShowCoinbaseConnectModal(false)}
                    onAuthorized={handleAuthorized}
                    stickyFooter={false}
                />
            </Modal>
            <Modal
                show={openCoinbase2FA}
                setShow={setOpenCoinbase2FA}
            >
                <Coinbase2FA
                    onSuccess={handleSuccess}
                    footerStickiness={false}
                />
            </Modal>
            <div className="w-full space-y-5 flex flex-col justify-between h-full text-secondary-text">
                <div className='space-y-4'>
                    <div className='border-secondary-500 rounded-md border bg-secondary-700 p-3'>
                        {
                            swap.exchange_account_connected ?
                                <SubmitButton
                                    isDisabled={loading}
                                    isSubmitting={loading}
                                    onClick={handleTransfer}
                                    icon={<ArrowLeftRight
                                        className="h-5 w-5 ml-2"
                                        aria-hidden="true"
                                    />}
                                >
                                    Transfer using Coinbase
                                </SubmitButton>
                                :
                                <SubmitButton
                                    isDisabled={loading}
                                    isSubmitting={loading}
                                    onClick={openConnect}
                                    icon={<Link
                                        className="h-5 w-5 ml-2"
                                        aria-hidden="true" />
                                    }
                                >
                                    Connect Coinbase account
                                </SubmitButton>
                        }
                    </div>
                </div>
            </div>
        </>
    )
}


export default Coinbase;