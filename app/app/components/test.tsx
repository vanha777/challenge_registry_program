'use client';

import { useEffect, useState } from 'react';
import * as anchor from '@coral-xyz/anchor';
import { useAnchorWallet, useConnection } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Program, BN } from '@coral-xyz/anchor';
import idl from '../../../target/idl/challenge_registry_program.json';
import { PublicKey } from '@solana/web3.js';
import { createInitializeMintInstruction, createAssociatedTokenAccountInstruction, createMintToInstruction, getAssociatedTokenAddress, TOKEN_PROGRAM_ID, MINT_SIZE } from "@solana/spl-token";
const mintKeypair = anchor.web3.Keypair.generate();
export default function TestPage() {
    const { connection } = useConnection();
    const wallet = useAnchorWallet();
    const [program, setProgram] = useState<Program | null>(null);
    const [status, setStatus] = useState<string>('');
    const [isWalletConnected, setIsWalletConnected] = useState(false);

    // Add new state variables for form inputs
    const [challenges, setChallenges] = useState<string[]>([]);
    const [newChallengeName, setNewChallengeName] = useState('');
    const [newChallengeMetadata, setNewChallengeMetadata] = useState('');
    const [newChallengeStake, setNewChallengeStake] = useState('');
    const [selectedChallenge, setSelectedChallenge] = useState('');
    const [stakeAmount, setStakeAmount] = useState('');

    // Add new state variable for NFT keypairs
    const [challengeNFTs, setChallengeNFTs] = useState<{ [name: string]: PublicKey }>({});
   // Create a new keypair for the mint account

    // Update useEffect to handle wallet connection status
    useEffect(() => {
        if (wallet) {
            setIsWalletConnected(true);
            const provider = new anchor.AnchorProvider(connection, wallet, {});
            const program = new anchor.Program(idl as any, provider);
            setProgram(program);
        } else {
            setIsWalletConnected(false);
        }
    }, [wallet, connection]);

    const createChallenge = async () => {
        if (!program || !wallet) return;
        try {
            setStatus('Creating challenge...');

            const requireStake = new BN(parseFloat(newChallengeStake) * 1e9);

            const tx = await program.methods
                .createChallenge(
                    newChallengeName,
                    newChallengeMetadata,
                    mintKeypair.publicKey,
                    requireStake
                )
                .accounts({
                    systemProgram: anchor.web3.SystemProgram.programId,
                })
                .rpc();

            // Store the NFT public key for this challenge
            setChallengeNFTs(prev => ({
                ...prev,
                [newChallengeName]: mintKeypair.publicKey
            }));

            // Add new challenge to the list
            setChallenges(prev => [...prev, newChallengeName]);
            setStatus(`Challenge created! Tx: ${tx}`);

            // Clear form
            setNewChallengeName('');
            setNewChallengeMetadata('');
            setNewChallengeStake('');
        } catch (error) {
            setStatus(`Error creating challenge: ${error}`);
        }
    };

    const stakeChallenge = async () => {
        if (!program || !wallet) return;

        try {
            setStatus('Staking challenge...');
            const amount = new BN(parseFloat(stakeAmount) * 1e9); // Convert SOL to lamports

            const tx = await program.methods
                .stakeChallenge(
                    selectedChallenge,
                    amount
                )
                .accounts({
                    systemProgram: anchor.web3.SystemProgram.programId,
                })
                .rpc();

            setStatus(`Challenge staked! Tx: ${tx}`);
            setStakeAmount('');
        } catch (error) {
            setStatus(`Error staking challenge: ${error}`);
        }
    };

    const claimChallenge = async () => {
        if (!program || !wallet || !selectedChallenge) return;

        try {
            setStatus('Claiming challenge...');
            const gameChallengeName = selectedChallenge;

            // Get the stored NFT public key for this challenge
            const nftMintPubkey = challengeNFTs[selectedChallenge];
            if (!nftMintPubkey) {
                throw new Error("NFT mint public key not found for this challenge");
            }

         

            // Get mint rent exemption
            const mintRent = await connection.getMinimumBalanceForRentExemption(MINT_SIZE);

            // Create mint account first
            const createMintTx = new anchor.web3.Transaction().add(
                anchor.web3.SystemProgram.createAccount({
                    fromPubkey: wallet.publicKey,
                    newAccountPubkey: mintKeypair.publicKey,
                    space: MINT_SIZE,
                    lamports: mintRent,
                    programId: TOKEN_PROGRAM_ID,
                }),
                createInitializeMintInstruction(
                    mintKeypair.publicKey,
                    0,
                    wallet.publicKey,
                    wallet.publicKey,
                )
            );

            if (!program.provider) throw new Error("Provider not found");
            const provider = program.provider as anchor.AnchorProvider;
            // Include the mintKeypair as a signer
            await provider.sendAndConfirm(createMintTx, [mintKeypair]);

            // Get ATA address for the challenge's NFT mint
            const ata = await getAssociatedTokenAddress(
                mintKeypair.publicKey,
                wallet.publicKey
            );

            // Create ATA and mint token in a single transaction
            const createAtaTx = new anchor.web3.Transaction().add(
                createAssociatedTokenAccountInstruction(
                    wallet.publicKey,
                    ata,
                    wallet.publicKey,
                    mintKeypair.publicKey
                ),
                createMintToInstruction(
                    mintKeypair.publicKey,
                    ata,
                    wallet.publicKey,
                    1
                )
            );

            await provider.sendAndConfirm(createAtaTx, []);

            // Execute the claim challenge transaction
            const tx = await program.methods
                .claimChallenge(gameChallengeName)
                .accounts({
                    tokenAccount: ata,
                    systemProgram: anchor.web3.SystemProgram.programId
                })
                .rpc();

            setStatus(`Challenge claimed! Tx: ${tx}`);
        } catch (error) {
            setStatus(`Error claiming challenge: ${error}`);
        }
    };

    return (
        <div className="p-8">
            <h1 className="text-2xl font-bold mb-6">Challenge Registry Program Tests</h1>

            <div className="space-y-4">
                <WalletMultiButton className="mb-4" />

                {!isWalletConnected ? (
                    <div className="text-red-500 mb-4">
                        Please connect your wallet to continue
                    </div>
                ) : (
                    <>
                        <div className="space-y-4 p-4 border rounded">
                            <h2 className="text-xl font-bold">Create New Challenge</h2>
                            <input
                                type="text"
                                placeholder="Challenge Name"
                                value={newChallengeName}
                                onChange={(e) => setNewChallengeName(e.target.value)}
                                className="w-full p-2 border rounded bg-black"
                            />
                            <input
                                type="text"
                                placeholder="Metadata URL"
                                value={newChallengeMetadata}
                                onChange={(e) => setNewChallengeMetadata(e.target.value)}
                                className="w-full p-2 border rounded bg-black"
                            />
                            <input
                                type="number"
                                placeholder="Required Stake (SOL)"
                                value={newChallengeStake}
                                onChange={(e) => setNewChallengeStake(e.target.value)}
                                className="w-full p-2 border rounded  bg-black "
                            />
                            <button
                                onClick={createChallenge}
                                className="bg-blue-500 text-white px-4 py-2 rounded"
                            >
                                Create Challenge
                            </button>
                        </div>

                        <div className="space-y-4 p-4 border rounded">
                            <h2 className="text-xl font-bold">Stake or Claim Challenge</h2>
                            <select
                                value={selectedChallenge}
                                onChange={(e) => setSelectedChallenge(e.target.value)}
                                className="w-full p-2 border rounded  bg-black "
                            >
                                <option value="">Select a Challenge</option>
                                {challenges.map((challenge) => (
                                    <option key={challenge} value={challenge}>
                                        {challenge}
                                    </option>
                                ))}
                            </select>

                            <div className="flex space-x-4">
                                <input
                                    type="number"
                                    placeholder="Stake Amount (SOL)"
                                    value={stakeAmount}
                                    onChange={(e) => setStakeAmount(e.target.value)}
                                    className="flex-1 p-2 border rounded bg-black"
                                />
                                <button
                                    onClick={stakeChallenge}
                                    className="bg-green-500 text-white px-4 py-2 rounded"
                                >
                                    Stake Challenge
                                </button>
                            </div>

                            <button
                                onClick={claimChallenge}
                                className="bg-purple-500 text-white px-4 py-2 rounded"
                            >
                                Claim Challenge
                            </button>
                        </div>
                    </>
                )}

                <div className="mt-4 p-4 bg-black rounded">
                    <h2 className="font-bold">Status:</h2>
                    <p>{status}</p>
                </div>
            </div>
        </div>
    );
}
