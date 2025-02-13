// 'use client'

// import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
// import { Auth } from '../auth'
// import { useWallet } from "@solana/wallet-adapter-react";
// import { clusterApiUrl, Connection, PublicKey } from '@solana/web3.js';
// export interface NFT {
//     id: string
//     name: string
//     image: string
//     description: string
//     price: number
//     currency: string
// }

// export interface CryptoAsset {
//     id: string
//     symbol: string
//     name: string
//     balance: number
//     price: number
//     icon: JSX.Element
// }

// export interface Voucher {
//     id: string
//     name: string
//     discount: string
//     validUntil: string
//     image: string
//     price: number
//     e_gift: string
// }

// export interface CryptoRate {
//     symbol: string
//     name: string
//     rate: number // Exchange rate to MTL
// }


// export interface Game {
//     id: string
//     name: string
//     image: string
//     platform: 'desktop' | 'mobile' | 'console'
//     rewards: number
//     description: string
//     link: string
//     rank: number
//     developer?: string
//     publisher?: string
//     played?: number
//     rewarded?: number
//     releaseDate?: string
//     genre?: string
//     intro?: string
//     trailer?: string
//     gameplay?: string
//     models?: {
//         playToEarn?: {
//             enabled: boolean
//             price: number
//         }
//         stakeToEarn?: {
//             enabled: boolean
//             price: string
//         }
//     }
// }

// interface MTLContextType {
//     balance: string
//     ownedNFTs: NFT[]
//     marketplaceNFTs: NFT[]
//     marketplaceVouchers: Voucher[]
//     exchangeRates: CryptoRate[]
//     games: Game[],
//     historyTransactions: Transaction[],
//     fetchTokenBalance: () => Promise<void>
//     fetchHistoryTransactions: () => Promise<void>
//     fetchGiftCards: () => Promise<void>
//     fetchGames: (platform?: 'desktop' | 'mobile' | 'console') => Promise<void>
//     updateGameStats: (gameId: string, played?: number, rewarded?: number) => Promise<void>
// }
// interface Transaction {
//     gameTitle: string
//     gameId: string
//     timestamp: number
//     status: string
//     message: string
// }

// const MTLContext = createContext<MTLContextType>({
//     balance: "",
//     ownedNFTs: [],
//     marketplaceNFTs: [],
//     marketplaceVouchers: [],
//     exchangeRates: [],
//     games: [],
//     historyTransactions: [],
//     fetchTokenBalance: async () => { },
//     fetchHistoryTransactions: async () => { },
//     fetchGiftCards: async () => { },
//     fetchGames: async () => { },
//     updateGameStats: async () => { }
// })

// const TOKEN_MINT_ADDRESS = "813b3AwivU6uxBicnXdZsCNrfzJy4U3Cr4ejwvH4V1Fz";

// export function MTLProvider({ children }: { children: ReactNode }) {
//     const { publicKey, connected, signMessage, sendTransaction } = useWallet();
//     const [balance, setBalance] = useState("")
//     const [historyTransactions, setHistoryTransactions] = useState<Transaction[]>([])
//     const [ownedNFTs, setOwnedNFTs] = useState<NFT[]>([])
//     const [marketplaceNFTs, setMarketplaceNFTs] = useState<NFT[]>([])
//     const [marketplaceVouchers, setMarketplaceVouchers] = useState<Voucher[]>([])
//     const [exchangeRates, setExchangeRates] = useState<CryptoRate[]>([])
//     const [games, setGames] = useState<Game[]>([])

//     const fetchTokenBalance = async () => {
//         const token = await TokenBalance();
//         console.log("mtl is ", token);
//         setBalance(token);
//     }

//     const fetchHistoryTransactions = async () => {
//         if (!publicKey) {
//             localStorage.removeItem('transactions');
//             setHistoryTransactions([]);
//             return;
//         }
//         const transactions = localStorage.getItem('transactions');
//         const parsedTransactions = transactions ? JSON.parse(transactions) : [];
//         setHistoryTransactions(parsedTransactions);
//     }

//     const fetchGiftCards = async () => {
//         const supabase = await Auth;
//         const { data, error } = await supabase
//             .from('gift_card')
//             .select('*')
//             .is('claimed_by', null);
//         if (data) {
//             setMarketplaceVouchers(data)
//         }
//     }

//     const fetchGames = async (platform?: 'desktop' | 'mobile' | 'console') => {
//         const supabase = await Auth;
//         let query = supabase.from('games').select('*');

//         if (platform) {
//             query = query.eq('platform', platform);
//         }

//         // Add ordering by rank in ascending order
//         query = query.order('rank', { ascending: true });

//         const { data, error } = await query;
//         if (data) {
//             setGames(data)
//         }
//     }

//     const updateGameStats = async (gameId: string, played?: number, rewarded?: number) => {
//         console.log("updating game stats ", gameId, played, rewarded);
//         const supabase = await Auth;
//         const updates: any = {};

//         if (played !== undefined) {
//             updates.played = played;
//         }
//         if (rewarded !== undefined) {
//             updates.rewarded = rewarded;
//         }

//         const { data, error } = await supabase
//             .from('games')
//             .update(updates)
//             .eq('id', gameId);

//         if (data) {
//             console.error('Success updated game stats:', gameId);
//         }

//         if (error) {
//             console.error('Error updating game stats:', error);
//             throw error;
//         }

//         // Refresh games data after update
//         await fetchGames();
//     }

//     const TokenBalance = async () => {
//         if (publicKey) {
//             try {
//                 // Connection to the Solana testnet
//                 const connection = new Connection(clusterApiUrl("testnet"), "confirmed");
//                 const ownerPublicKey = new PublicKey(publicKey.toBase58());
//                 const mintPublicKey = new PublicKey(TOKEN_MINT_ADDRESS);

//                 // Fetch all token accounts owned by the wallet
//                 const tokenAccounts = await connection.getParsedTokenAccountsByOwner(ownerPublicKey, {
//                     mint: mintPublicKey,
//                 });

//                 // Sum up balances from all accounts holding the specified token
//                 const tokenBalance = tokenAccounts.value.reduce((sum, accountInfo) => {
//                     const amount = accountInfo.account.data.parsed.info.tokenAmount.uiAmount;
//                     return sum + amount;
//                 }, 0);
//                 console.log("tokenBalance is ", tokenBalance);

//                 // Helper function to format decimals
//                 const formatDecimals = (num: number) => {
//                     const decimals = num % 1;
//                     if (decimals === 0) return '';
//                     return decimals.toFixed(9).substring(1);
//                 };

//                 // Format balance with appropriate units
//                 const millions = Math.floor(tokenBalance / 1000000);
//                 const thousands = Math.floor((tokenBalance % 1000000) / 1000);
//                 const ones = Math.floor(tokenBalance % 1000);
//                 const decimals = formatDecimals(tokenBalance);

//                 let formattedBalance = '';

//                 if (millions > 0) {
//                     formattedBalance += `${millions} Million `;
//                 }
//                 if (thousands > 0) {
//                     formattedBalance += `${thousands} Thousand `;
//                 }
//                 if (ones > 0) {
//                     formattedBalance += ones;
//                 }

//                 // Add decimals if they exist
//                 if (decimals) {
//                     formattedBalance += decimals;
//                 }

//                 // Handle case where balance is 0
//                 if (formattedBalance === '') {
//                     formattedBalance = '0';
//                 }

//                 return formattedBalance.trim();
//             } catch (error) {
//                 console.error("Failed to fetch token balance:", error);
//                 return "0";
//             }
//         }
//         else {
//             return "~";
//         }
//     };

//     useEffect(() => {
//         const fetchData = async () => {
//             try {
//                 // Initial data fetch
//                 // get MTL token
//                 const token = await TokenBalance();
//                 console.log("mtl is ", token);
//                 setBalance(token);

//                 await fetchGiftCards();
//                 await fetchGames();

//                 // if (user) {
//                 //     // Fetch user's NFTs
//                 //     const nftResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/nfts/${user.id}`)
//                 //     const nftData = await nftResponse.json()
//                 //     setOwnedNFTs(nftData)

//                 //     // Fetch marketplace vouchers
//                 //     const voucherResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/marketplace/vouchers`)
//                 //     const voucherData = await voucherResponse.json()
//                 //     setMarketplaceVouchers(voucherData)

//                 //     // Fetch exchange rates
//                 //     const ratesResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/exchange-rates`)
//                 //     const ratesData = await ratesResponse.json()
//                 //     setExchangeRates(ratesData)
//                 // }
//             } catch (error) {
//                 console.error('Error fetching data:', error)
//             }
//         }

//         fetchData()
//     }, [publicKey])

//     return (
//         <MTLContext.Provider value={{
//             fetchGiftCards,
//             fetchHistoryTransactions,
//             fetchTokenBalance,
//             fetchGames,
//             updateGameStats,
//             balance,
//             ownedNFTs,
//             marketplaceNFTs,
//             marketplaceVouchers,
//             exchangeRates,
//             games,
//             historyTransactions
//         }}>
//             {children}
//         </MTLContext.Provider>
//     )
// }

// export function useMTL() {
//     const context = useContext(MTLContext)
//     if (!context) {
//         throw new Error('useMTL must be used within an MTLProvider')
//     }
//     return context
// }
