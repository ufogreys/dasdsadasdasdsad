import Head from 'next/head'
import Layout from '../components/layout'
import slug from 'rehype-slug'
import fs from 'fs'
import path from 'path'
import { serialize } from "next-mdx-remote/serialize";
import React, { useCallback } from 'react'
import { MDXRemote } from 'next-mdx-remote'
import imageSize from "rehype-img-size";
import LayerSwapApiClient from '../lib/layerSwapApiClient'
import { CryptoNetwork } from '../Models/CryptoNetwork'
import { Exchange } from '../Models/Exchange'
import { useRouter } from 'next/router'
import { MenuProvider } from '../context/menu'
import HeaderWithMenu from '../components/HeaderWithMenu'
import Image from 'next/image'
import { LayerSwapAppSettings } from '../Models/LayerSwapAppSettings'

const ResponsiveImage = (props) => {

    const router = useRouter();
    return <Image
        alt={props.alt}
        sizes="100vw"
        height={100}
        width={100}
        style={{ width: '100%', height: 'auto' }}
        {...props}
        src={`${router?.basePath}${props.src}`}
    />
}
const components = {
    Image: ResponsiveImage,
}
export default function ForPartners(props) {
    const router = useRouter();
    let appSettings = new LayerSwapAppSettings(props.settings)

    const handleGoBack = useCallback(() => {
        router.back()
    }, [router])

    return (
        <Layout settings={appSettings}>
            <div className="shadow-card rounded-lg w-full flex content-center items-center justify-center mb-5 space-y-5 flex-col container bg-secondary-900 md:shadow-card sm:overflow-hidden relative">
                <Head>
                    <title>Layerswap Partners</title>
                </Head>
                <main className='w-full h-full sm:max-h-[70vh] max-h-[100vh] overflow-auto styled-scroll'>
                    <MenuProvider>
                        <HeaderWithMenu goBack={handleGoBack} />
                    </MenuProvider>
                    <div className="flex-col justify-center py-4 md:px-8 px-6">
                        <div className="prose md:prose-xl text-secondary-text">
                            <MDXRemote components={components} {...props.mdxSource} />
                        </div>
                        <p id='bottom' className='text-prymary-text text-lg md:text-xl text-left font-bold my-10'>Available values for the destNetwork parameter</p>
                        <div>
                            <div className="mt-8 flex flex-col">
                                <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
                                    <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
                                        <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                                            <table className="min-w-full divide-y divide-secondary-500">
                                                <thead className="bg-secondary-500">
                                                    <tr>
                                                        <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-secondary-text sm:pl-6">
                                                            Network Name
                                                        </th>
                                                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-secondary-text">
                                                            Query parameter value
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-secondary-700 bg-secondary-600">
                                                    {props?.networks?.map((n) => (
                                                        <tr key={n.display_name}>
                                                            <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm text-prymary-text font-medium sm:pl-6">
                                                                {n.display_name}
                                                            </td>
                                                            <td className="whitespace-nowrap px-3 py-4 text-sm text-prymary-text italic">{n.internal_name}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <p id='bottom2' className='text-prymary-text text-lg md:text-xl text-left font-bold my-10'>Available values for the sourceExchangeName parameter</p>
                        <div>
                            <div className="mt-8 flex flex-col">
                                <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
                                    <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
                                        <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                                            <table className="min-w-full divide-y divide-secondary-500">
                                                <thead className="bg-secondary-500">
                                                    <tr>
                                                        <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-secondary-text sm:pl-6">
                                                            Exchange Name
                                                        </th>
                                                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-secondary-text">
                                                            Query parameter value
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-secondary-700 bg-secondary-600">
                                                    {props?.exchanges?.map((e) => (
                                                        <tr key={e.display_name}>
                                                            <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm text-prymary-text font-medium sm:pl-6">
                                                                {e.display_name}
                                                            </td>
                                                            <td className="whitespace-nowrap px-3 py-4 text-sm text-prymary-text italic">{e.internal_name}</td>
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
                <div id="widget_root" />
            </div>
        </Layout>
    )
}

export async function getStaticProps() {
    const markdown = fs.readFileSync(path.join(process.cwd(), 'public/doc/forPartners.md'), 'utf-8');
    const mdxSource = await serialize(markdown, {
        mdxOptions: {
            rehypePlugins: [slug, [imageSize, { dir: "public" }]],
        },
    });
    var apiClient = new LayerSwapApiClient();
    const { data: settings } = await apiClient.GetSettingsAsync()
    var networks: CryptoNetwork[] = [];
    var exchanges: Exchange[] = [];
    networks = settings.networks.filter(n => n.status !== "inactive");
    exchanges = settings.exchanges

    return {
        props: {
            mdxSource,
            networks,
            exchanges,
            settings
        },
    }
}