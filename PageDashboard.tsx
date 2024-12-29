import React, { useState, useEffect } from "react"

interface PoolData {
    tvl?: string
    totalShares?: string
    stakedAmount?: string
    osmoPrice?: number
    assets?: {
        token: string
        amount: string
    }[]
    stakingMetrics?: {
        totalStaked?: string
        stakingApr?: number
        stakingRewards?: string
    }
    pageDAOStakingMetrics?: {
        totalStaked?: string
        stakingRewards?: number
        stakingApr?: number
    }
}

interface ChainData {
    supply?: number
}

const POOL_ID = "1344"
const OSMOSIS_LCD = "https://lcd.osmosis.zone"
const DAO_ADDRESS =
    "osmo15ma5het3fqr7a45wqvgq0mfmdc2dgy8enepz8s7r0856f8xxtwyq2r5c3e"
const PAGE_DAO_ADDRESS =
    "osmo1a40j922z0kwqhw2nn0nx66ycyk88vyzcs73fyjrd092cjgyvyjksrd8dp7"
const CHAIN_ID = "osmosis-1"
const BASE_URL = "https://indexer.daodao.zone"
const COINGECKO_API = "https://api.coingecko.com/api/v3"
const PAGE_STAKING_REWARDS_PER_MINUTE = 19 // 19 $PAGE per minute

const PAGE_CONTRACTS = {
    ETH: "0x60e683C6514Edd5F758A55b6f393BeBBAfaA8d5e",
    OPTIMISM: "0xe67E77c47a37795c0ea40A038F7ab3d76492e803",
    POLYGON: "0x9ceE70895726B0ea14E6019C961dAf32222a7C2f",
    BASE: "0xc4730f86d1F86cE0712a7b17EE919Db7dEFad7FE",
}

const RPC_URLS = {
    ETH: "https://eth.public-rpc.com",
    OPTIMISM: "https://mainnet.optimism.io",
    POLYGON: "https://polygon-rpc.com",
    BASE: "https://mainnet.base.org",
}

const cellStyle = {
    padding: "12px",
    borderBottom: "1px solid #e5e7eb",
    textAlign: "right",
    fontFamily: "monospace",
} as const

// Helper function to calculate APR
const calculateAPR = (totalStaked: string, rewardsPerMinute: number) => {
    if (!totalStaked || Number(totalStaked) === 0) return 0

    const annualRewards = rewardsPerMinute * 60 * 24 * 365 // Rewards per year
    const apr = (annualRewards / Number(totalStaked)) * 100 // APR in percentage
    return apr
}

// Fetch PageDAO staking data
const fetchPageDAOStakingData = async () => {
    try {
        // Fetch total staked $PAGE from the staking contract
        const totalStakedUrl = `${BASE_URL}/${CHAIN_ID}/contract/osmo1xcemevq5sazptkwtqg7vam3h44ks537ytv3pz7cu689yse53q8js3r9xr9/daoVotingTokenStaked/totalPower`
        const totalStakedRes = await fetch(totalStakedUrl)
        const totalStakedData = await totalStakedRes.json()
        console.log("Total Staked Data:", totalStakedData)

        // Inspect the structure of the response
        console.log(
            "API Response Structure:",
            JSON.stringify(totalStakedData, null, 2)
        )

        // Treat the response as the raw value directly
        const rawValue = totalStakedData || "0"
        console.log("Raw Value:", rawValue)

        // Handle large numbers using BigInt and adjust for 8 decimals
        const rawTotalStaked = BigInt(rawValue)
        console.log("Raw Total Staked (BigInt):", rawTotalStaked)

        const totalStaked = Number(rawTotalStaked) / 1e8 // Divide by 1e8 and convert to Number
        console.log("Total $PAGE Staked (After Division):", totalStaked)

        return {
            totalStaked: totalStaked.toString(), // Return as a string for consistency
        }
    } catch (err) {
        console.error("Error fetching PageDAO staking data:", err)
        return null
    }
}

function PoolMetricsTable({
    data,
    chainData,
    osmosisPageSupply,
}: {
    data: PoolData
    chainData: Record<string, ChainData>
    osmosisPageSupply: number
}) {
    const calculateMetrics = () => {
        const osmoAmount =
            data.assets?.find((a) => a.token === "uosmo")?.amount || "0"
        const pageAmount =
            data.assets?.find(
                (a) =>
                    a.token ===
                    "ibc/23A62409E4AD8133116C249B1FA38EED30E500A115D7B153109462CD82C1CD99"
            )?.amount || "0"

        const osmoInPool = Number(osmoAmount) / 1e6
        const pageInPool = Number(pageAmount) / 1e8
        const gammShares = Number(data.totalShares) / 1e18
        const gammStaked = Number(data.stakedAmount) / 1e18
        const stakingRatio = (gammStaked / gammShares) * 100

        const osmoPrice = data.osmoPrice || 0

        // Calculate PAGE price in USD
        const pagePriceUsd = (osmoInPool * osmoPrice) / pageInPool

        // Calculate GAMM price in OSMO and USD
        const gammPriceInOsmo = (osmoInPool * 2) / gammShares
        const gammPriceUsd = gammPriceInOsmo * osmoPrice

        // Calculate total value staked
        const totalValueStaked = gammStaked * gammPriceInOsmo
        const totalValueStakedUsd = totalValueStaked * osmoPrice

        // Calculate APR
        const annualPageEmission = 1.9 * 60 * 24 * 365
        const emissionValueInOsmo =
            annualPageEmission * (osmoInPool / pageInPool)
        const apr = (emissionValueInOsmo / totalValueStaked) * 100

        return {
            gammShares,
            gammStaked,
            stakingRatio,
            pageInPool,
            osmoInPool,
            tvl: osmoInPool * 2,
            tvlUsd: osmoInPool * 2 * osmoPrice,
            gammPriceInOsmo,
            gammPriceUsd,
            pagePriceUsd,
            totalValueStaked,
            totalValueStakedUsd,
            apr,
        }
    }

    const metrics = calculateMetrics()

    // Sort chains by supply in descending order
    const sortedChains = Object.entries(chainData).sort(
        ([, a], [, b]) => (b.supply || 0) - (a.supply || 0)
    )

    return (
        <div
            style={{
                backgroundColor: "#ffffff",
                borderRadius: "12px",
                padding: "24px",
                boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
            }}
        >
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <tbody>
                    {/* Token Supply Section */}
                    <tr>
                        <td
                            colSpan={3}
                            style={{
                                ...cellStyle,
                                textAlign: "left",
                                fontWeight: "bold",
                                backgroundColor: "#f9fafb",
                            }}
                        >
                            Token Supply
                        </td>
                    </tr>
                    {sortedChains.map(([chain, data]) => (
                        <tr key={chain}>
                            <td style={{ ...cellStyle, textAlign: "left" }}>
                                {chain === "ETH"
                                    ? "MAX Supply"
                                    : `${chain} PAGE Supply`}
                            </td>
                            <td style={cellStyle}>
                                {data.supply?.toLocaleString()}
                            </td>
                            <td style={cellStyle}>
                                {data.supply && metrics.pagePriceUsd
                                    ? `$${(
                                          data.supply * metrics.pagePriceUsd
                                      ).toLocaleString(undefined, {
                                          maximumFractionDigits: 4,
                                      })}`
                                    : ""}
                            </td>
                        </tr>
                    ))}
                    <tr>
                        <td style={{ ...cellStyle, textAlign: "left" }}>
                            Osmosis PAGE Supply
                        </td>
                        <td style={cellStyle}>
                            {osmosisPageSupply.toLocaleString(undefined, {
                                maximumFractionDigits: 6,
                            })}
                        </td>
                        <td style={cellStyle}>
                            $
                            {(
                                osmosisPageSupply * metrics.pagePriceUsd
                            ).toLocaleString(undefined, {
                                maximumFractionDigits: 4,
                            })}
                        </td>
                    </tr>

                    {/* Liquidity Pool Information Section */}
                    <tr>
                        <td
                            colSpan={3}
                            style={{
                                ...cellStyle,
                                textAlign: "left",
                                fontWeight: "bold",
                                backgroundColor: "#f9fafb",
                            }}
                        >
                            Liquidity Pool Information (Pool 1344)
                        </td>
                    </tr>
                    <tr>
                        <td style={{ ...cellStyle, textAlign: "left" }}>
                            GAMM-1344 Supply
                        </td>
                        <td style={cellStyle}>
                            {metrics.gammShares.toLocaleString(undefined, {
                                maximumFractionDigits: 6,
                            })}
                        </td>
                        <td style={cellStyle}>
                            $
                            {(
                                metrics.gammShares * metrics.gammPriceUsd
                            ).toLocaleString(undefined, {
                                maximumFractionDigits: 4,
                            })}
                        </td>
                    </tr>
                    <tr>
                        <td style={{ ...cellStyle, textAlign: "left" }}>
                            GAMM-1344 Staked
                        </td>
                        <td style={cellStyle}>
                            {metrics.gammStaked.toLocaleString(undefined, {
                                maximumFractionDigits: 6,
                            })}
                        </td>
                        <td style={cellStyle}>
                            $
                            {(
                                metrics.gammStaked * metrics.gammPriceUsd
                            ).toLocaleString(undefined, {
                                maximumFractionDigits: 4,
                            })}
                        </td>
                    </tr>
                    <tr>
                        <td style={{ ...cellStyle, textAlign: "left" }}>
                            Staking Ratio
                        </td>
                        <td style={cellStyle}>
                            {metrics.stakingRatio.toLocaleString(undefined, {
                                maximumFractionDigits: 2,
                            })}
                        </td>
                        <td style={cellStyle}></td>
                    </tr>
                    <tr>
                        <td style={{ ...cellStyle, textAlign: "left" }}>
                            Staking APR
                        </td>
                        <td style={cellStyle}>
                            {metrics.apr.toLocaleString(undefined, {
                                maximumFractionDigits: 2,
                            })}
                        </td>
                        <td style={cellStyle}></td>
                    </tr>
                    <tr>
                        <td style={{ ...cellStyle, textAlign: "left" }}>
                            PAGE in Pool
                        </td>
                        <td style={cellStyle}>
                            {metrics.pageInPool.toLocaleString(undefined, {
                                maximumFractionDigits: 6,
                            })}
                        </td>
                        <td style={cellStyle}>
                            $
                            {(
                                metrics.pageInPool * metrics.pagePriceUsd
                            ).toLocaleString(undefined, {
                                maximumFractionDigits: 4,
                            })}
                        </td>
                    </tr>
                    <tr>
                        <td style={{ ...cellStyle, textAlign: "left" }}>
                            OSMO in Pool
                        </td>
                        <td style={cellStyle}>
                            {metrics.osmoInPool.toLocaleString(undefined, {
                                maximumFractionDigits: 6,
                            })}
                        </td>
                        <td style={cellStyle}>
                            $
                            {(
                                metrics.osmoInPool * (data.osmoPrice || 0)
                            ).toLocaleString(undefined, {
                                maximumFractionDigits: 4,
                            })}
                        </td>
                    </tr>

                    {/* Pricing Information Section */}
                    <tr>
                        <td
                            colSpan={3}
                            style={{
                                ...cellStyle,
                                textAlign: "left",
                                fontWeight: "bold",
                                backgroundColor: "#f9fafb",
                            }}
                        >
                            Pricing Information
                        </td>
                    </tr>
                    <tr>
                        <td style={{ ...cellStyle, textAlign: "left" }}>
                            PAGE Price
                        </td>
                        <td style={cellStyle}>
                            {(
                                metrics.pagePriceUsd / (data.osmoPrice || 1)
                            ).toLocaleString(undefined, {
                                maximumFractionDigits: 6,
                            })}
                        </td>
                        <td style={cellStyle}>
                            $
                            {metrics.pagePriceUsd.toLocaleString(undefined, {
                                maximumFractionDigits: 4,
                            })}
                        </td>
                    </tr>
                    <tr>
                        <td style={{ ...cellStyle, textAlign: "left" }}>
                            GAMM Price
                        </td>
                        <td style={cellStyle}>
                            {metrics.gammPriceInOsmo.toLocaleString(undefined, {
                                maximumFractionDigits: 6,
                            })}
                        </td>
                        <td style={cellStyle}>
                            $
                            {metrics.gammPriceUsd.toLocaleString(undefined, {
                                maximumFractionDigits: 4,
                            })}
                        </td>
                    </tr>
                    <tr>
                        <td style={{ ...cellStyle, textAlign: "left" }}>
                            OSMO Price
                        </td>
                        <td style={cellStyle}></td>
                        <td style={cellStyle}>
                            $
                            {(data.osmoPrice || 0).toLocaleString(undefined, {
                                maximumFractionDigits: 4,
                            })}
                        </td>
                    </tr>

                    {/* PageDAO Staking Metrics Section */}
                    <tr>
                        <td
                            colSpan={3}
                            style={{
                                ...cellStyle,
                                textAlign: "left",
                                fontWeight: "bold",
                                backgroundColor: "#f9fafb",
                            }}
                        >
                            PageDAO Staking Metrics
                        </td>
                    </tr>
                    <tr>
                        <td style={{ ...cellStyle, textAlign: "left" }}>
                            Total $PAGE Staked
                        </td>
                        <td style={cellStyle}>
                            {data.pageDAOStakingMetrics?.totalStaked?.toLocaleString(
                                undefined,
                                {
                                    maximumFractionDigits: 6,
                                }
                            )}
                        </td>
                        <td style={cellStyle}>
                            $
                            {(
                                Number(
                                    data.pageDAOStakingMetrics?.totalStaked || 0
                                ) * metrics.pagePriceUsd
                            ).toLocaleString(undefined, {
                                maximumFractionDigits: 4,
                            })}
                        </td>
                    </tr>
                    <tr>
                        <td style={{ ...cellStyle, textAlign: "left" }}>
                            $PAGE Staking Rewards
                        </td>
                        <td style={cellStyle}>
                            {data.pageDAOStakingMetrics?.stakingRewards?.toLocaleString(
                                undefined,
                                {
                                    maximumFractionDigits: 6,
                                }
                            )}{" "}
                            /min
                        </td>
                        <td style={cellStyle}></td>
                    </tr>
                    <tr>
                        <td style={{ ...cellStyle, textAlign: "left" }}>APR</td>
                        <td style={cellStyle}>
                            {data.pageDAOStakingMetrics?.stakingApr?.toLocaleString(
                                undefined,
                                {
                                    maximumFractionDigits: 2,
                                }
                            )}
                        </td>
                        <td style={cellStyle}></td>
                    </tr>
                </tbody>
            </table>
        </div>
    )
}

const useChainData = () => {
    const [data, setData] = useState<Record<string, ChainData>>({})
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchTokenSupply = async (chain: string, address: string) => {
        const response = await fetch(RPC_URLS[chain as keyof typeof RPC_URLS], {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                jsonrpc: "2.0",
                method: "eth_call",
                params: [
                    {
                        to: address,
                        data: "0x18160ddd",
                    },
                    "latest",
                ],
                id: 1,
            }),
        })
        const json = await response.json()
        const supply = BigInt(json.result)
        return Number(supply) / 1e8
    }

    useEffect(() => {
        const fetchChainData = async () => {
            try {
                const chainPromises = Object.entries(PAGE_CONTRACTS).map(
                    async ([chain, address]) => {
                        const supply = await fetchTokenSupply(chain, address)
                        console.log(`${chain} supply:`, supply)
                        return [chain, { supply }]
                    }
                )
                const chainResults = await Promise.all(chainPromises)
                const finalData = Object.fromEntries(chainResults)
                console.log("Final chain data:", finalData)
                setData(finalData)
            } catch (err) {
                setError(
                    `Failed to fetch chain data: ${err instanceof Error ? err.message : String(err)}`
                )
            } finally {
                setLoading(false)
            }
        }
        fetchChainData()
    }, [])

    return { data, loading, error }
}

const PageDashboard = () => {
    const [poolData, setPoolData] = useState<PoolData>({})
    const [osmosisPageSupply, setOsmosisPageSupply] = useState<number>(0)
    const {
        data: chainData,
        loading: chainDataLoading,
        error: chainDataError,
    } = useChainData()
    const [isLoading, setIsLoading] = useState(true) // Global loading state

    useEffect(() => {
        const fetchPoolData = async () => {
            try {
                // Fetch Osmosis pool data
                const poolUrl = `${OSMOSIS_LCD}/osmosis/gamm/v1beta1/pools/${POOL_ID}`
                const poolResponse = await fetch(poolUrl)
                const poolData = await poolResponse.json()

                // Fetch voting module data for Pool 1344
                const votingModuleUrl = `${BASE_URL}/${CHAIN_ID}/contract/${DAO_ADDRESS}/daoCore/votingModule`
                const votingModuleRes = await fetch(votingModuleUrl)
                const votingModuleData = await votingModuleRes.json()

                // Fetch stakers data for Pool 1344
                const stakersUrl = `${BASE_URL}/${CHAIN_ID}/contract/${votingModuleData}/daoVotingTokenStaked/listStakers`
                const stakersRes = await fetch(stakersUrl)
                const stakersData = await stakersRes.json()

                const totalStaked =
                    stakersData.stakers
                        ?.reduce(
                            (acc: number, s: any) => acc + Number(s.balance),
                            0
                        )
                        .toString() || "0"

                // Fetch OSMO price
                const osmoPriceUrl = `${COINGECKO_API}/simple/price?ids=osmosis&vs_currencies=usd`
                const osmoPriceRes = await fetch(osmoPriceUrl)
                const osmoPriceData = await osmoPriceRes.json()
                const osmoPrice = osmoPriceData.osmosis.usd

                // Fetch Osmosis PAGE supply
                const osmosisPageSupplyUrl = `${OSMOSIS_LCD}/cosmos/bank/v1beta1/supply/by_denom?denom=ibc/23A62409E4AD8133116C249B1FA38EED30E500A115D7B153109462CD82C1CD99`
                const osmosisPageSupplyRes = await fetch(osmosisPageSupplyUrl)
                const osmosisPageSupplyData = await osmosisPageSupplyRes.json()
                const osmosisPageSupply =
                    Number(osmosisPageSupplyData.amount.amount) / 1e8

                // Fetch PageDAO staking data
                const pageDAOStakingData = await fetchPageDAOStakingData()

                setPoolData({
                    totalShares: poolData.pool?.total_shares?.amount,
                    stakedAmount: totalStaked,
                    osmoPrice: osmoPrice,
                    assets: poolData.pool?.pool_assets?.map((asset: any) => ({
                        token: asset.token?.denom,
                        amount: asset.token?.amount,
                    })),
                    stakingMetrics: {
                        totalStaked: totalStaked,
                        stakingApr: null, // Replace with actual APR if available
                        stakingRewards: null, // Replace with actual rewards if available
                    },
                    pageDAOStakingMetrics: {
                        totalStaked: pageDAOStakingData?.totalStaked,
                        stakingRewards: PAGE_STAKING_REWARDS_PER_MINUTE,
                        stakingApr: calculateAPR(
                            pageDAOStakingData?.totalStaked,
                            PAGE_STAKING_REWARDS_PER_MINUTE
                        ),
                    },
                })
                setOsmosisPageSupply(osmosisPageSupply)
            } catch (err) {
                console.error("Error fetching pool data:", err)
            } finally {
                setIsLoading(false) // Set loading to false when all data is fetched
            }
        }

        fetchPoolData()
    }, [])

    // Combine loading states
    const isDataReady = !isLoading && !chainDataLoading

    if (!isDataReady) {
        return (
            <div
                style={{
                    textAlign: "center",
                    padding: "40px",
                    color: "#6b7280",
                }}
            >
                Loading PAGE token metrics...
            </div>
        )
    }

    return (
        <div style={{ maxWidth: "800px", margin: "0 auto", padding: "20px" }}>
            <h2
                style={{
                    fontSize: "24px",
                    fontWeight: "bold",
                    textAlign: "center",
                    marginBottom: "24px",
                    color: "#111827",
                }}
            >
                PAGE Token Metrics
            </h2>
            <PoolMetricsTable
                data={poolData}
                chainData={chainData}
                osmosisPageSupply={osmosisPageSupply}
            />
            {chainDataError && (
                <div
                    style={{
                        marginTop: "20px",
                        padding: "12px",
                        backgroundColor: "#fee2e2",
                        borderRadius: "8px",
                        color: "#991b1b",
                        textAlign: "center",
                    }}
                >
                    {chainDataError}
                </div>
            )}
        </div>
    )
}

export default PageDashboard as React.ComponentType
