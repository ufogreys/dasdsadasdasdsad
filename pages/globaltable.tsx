import Head from 'next/head'
import Layout from '../components/layout'
import React, { useCallback } from 'react'
import LayerSwapApiClient from '../lib/layerSwapApiClient'
import { CryptoNetwork } from '../Models/CryptoNetwork'
import { Exchange } from '../Models/Exchange'
import { useRouter } from 'next/router'
import { ArrowLeft } from 'lucide-react'
import LayerSwapAuthApiClient from '../lib/userAuthApiClient'
import { InferGetServerSidePropsType } from 'next'
import { LayerSwapAppSettings } from '../Models/LayerSwapAppSettings'

export default function GlobalTable(props, { settings }: InferGetServerSidePropsType<typeof getServerSideProps>) {
    const router = useRouter();
    LayerSwapAuthApiClient.identityBaseEndpoint = settings.discovery.identity_url
    let appSettings = new LayerSwapAppSettings(settings)

    const handleGoBack = useCallback(() => {
        router.back()
    }, [router])

    return (
        <Layout settings={appSettings}>
            <div className="flex content-center items-center justify-center mb-5 space-y-5 flex-col container mx-auto sm:px-6 lg:px-8 max-w-md md:max-w-3xl">
                <Head>
                    <title>Table</title>
                </Head>
                <main>
                    <div className="flex-col justify-center py-4">
                        <div className="mt-3 flex items-center justify-between z-20" >
                            <div className="flex ">
                                <button onClick={handleGoBack} className="self-start md:mt-2">
                                    <ArrowLeft className='h-5 w-5 text-secondary-text hover:text-secondary-600 cursor-pointer' />
                                </button>
                            </div>
                        </div>
                        <div>
                            <div className="flex flex-col max-w-sm md:max-w-6xl">
                                <div className="overflow-x-auto styled-scroll">
                                    <div className="inline-block min-w-full py-2 align-middle">
                                        <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                                            <table className="min-w-full divide-y divide-secondary-600 ">
                                                <thead className="bg-secondary-600">
                                                    <tr className="divide-x divide-secondary-600">
                                                        <th scope="col" className="py-3.5 pl-4 pr-4 text-left text-sm font-semibold sm:pl-6">

                                                        </th>
                                                        {
                                                            props?.networks?.map((n) => (
                                                                <th key={(n as CryptoNetwork).internal_name} scope="col" className="px-4 py-3.5 text-left text-sm font-semibold text-secondary-text">
                                                                    {n.display_name}
                                                                </th>
                                                            ))
                                                        }

                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-secondary-600 bg-secondary-500">
                                                    {props?.exchanges.map((e) => (
                                                        <tr key={e.id} className="divide-x divide-secondary-600">
                                                            <td className="whitespace-nowrap py-4 pl-4 pr-4 text-sm font-semibold text-secondary-text sm:pl-6">
                                                                {e.display_name}
                                                            </td>
                                                            {props?.networks?.map((n) => (
                                                                <td key={(n as CryptoNetwork).internal_name} className="whitespace-nowrap p-4 text-sm text-primary-text">{e?.currencies.map((currency) => currency.asset).filter(e => n?.currencies.map((c) => c.asset).includes(e)).filter((v, i, a) => a.indexOf(v) === i).join(', ')}</td>
                                                            ))}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </Layout>
    )
}

export async function getServerSideProps(context) {

    context.res.setHeader(
        'Cache-Control',
        's-maxage=60, stale-while-revalidate'
    );

    var apiClient = new LayerSwapApiClient();
    const { data: settings } = await apiClient.GetSettingsAsync()

    const resource_storage_url = settings.discovery.resource_storage_url
    if (resource_storage_url[resource_storage_url.length - 1] === "/")
        settings.discovery.resource_storage_url = resource_storage_url.slice(0, -1)

    LayerSwapAuthApiClient.identityBaseEndpoint = settings.discovery.identity_url

    return {
        props: { settings }
    }
}