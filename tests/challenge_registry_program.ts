import * as anchor from "@coral-xyz/anchor";
import { BN, Program } from "@coral-xyz/anchor";
import { ChallengeRegistryProgram } from "../target/types/challenge_registry_program";
import { assert } from "chai";
import { createInitializeMintInstruction, createAssociatedTokenAccountInstruction, createMintToInstruction, getAssociatedTokenAddress, TOKEN_PROGRAM_ID, MINT_SIZE } from "@solana/spl-token";
const program = anchor.workspace.ChallengeRegistryProgram as Program<ChallengeRegistryProgram>;
const nftKeypair = anchor.web3.Keypair.generate();
const gameChallengeName = "Test Challenge";
// Generate keypairs for required accounts
const sender = anchor.web3.Keypair.fromSecretKey(
  Uint8Array.from(
    JSON.parse(
      require('fs').readFileSync(
        require('os').homedir() + '/metaloot-keypair.json',
        'utf-8'
      )
    )
  )
);

it("Can create a challenge", async () => {
  const requireStake = 500000000;
  // Create the studio with full metadata
  const tx = await program.methods
    .createChallenge(
      gameChallengeName,
      "https://test-studio.com/metadata.json",
      nftKeypair.publicKey,
      new BN(requireStake)
    )
    .accounts({
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .signers([sender])
    .rpc();

  console.log("Create studio transaction signature:", tx);

  // Fetch the created entry account and verify its data
  const entryAccount = await program.account.challengeRegistryMetadata.fetch(
    anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("challenge"), Buffer.from(gameChallengeName)],
      program.programId
    )[0]
  );
  console.log("entryAccount", entryAccount);
  let test = entryAccount.nft.toBase58();
  console.log("Created studio :", test);
  assert.equal(entryAccount.name, gameChallengeName);
  assert.equal(entryAccount.uri, "https://test-studio.com/metadata.json");
  assert.equal(test, nftKeypair.publicKey.toBase58());
  assert.equal(entryAccount.requireStake.toString(), requireStake.toString());
  assert.equal(entryAccount.totalStaked.toString(), "0");
});

it("Can stake a challenge", async () => {
  // Generate keypairs for required accounts
  const sender = anchor.web3.Keypair.fromSecretKey(
    Uint8Array.from(
      JSON.parse(
        require('fs').readFileSync(
          require('os').homedir() + '/metaloot-keypair.json',
          'utf-8'
        )
      )
    )
  );
  const amount = 50000000;

  const tx2 = await program.methods
    .stakeChallenge(
      gameChallengeName,
      new BN(amount)
    )
    .accounts({
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .signers([sender])
    .rpc();

  const poolAccount = await program.account.challengeRegistryMetadata.fetch(
    anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("challenge"), Buffer.from(gameChallengeName)],
      program.programId
    )[0]
  );
  const playerAccount = await program.account.playerMetadata.fetch(
    anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("player"), sender.publicKey.toBuffer(), Buffer.from(gameChallengeName)],
      program.programId
    )[0]
  );
  console.log("poolAccount", poolAccount.totalStaked.toString());
  console.log("playerAccount", playerAccount.stakeAmount.toString());

  console.log("Stake challenge transaction signature:", tx2);
  assert.equal(poolAccount.totalStaked.toString(), amount.toString());
  assert.equal(playerAccount.stakeAmount.toString(), amount.toString());

});

it("Can claim the challenge", async () => {
  // Create mint account
  const mintRent = await program.provider.connection.getMinimumBalanceForRentExemption(MINT_SIZE);
  const createMintTx = new anchor.web3.Transaction().add(
    anchor.web3.SystemProgram.createAccount({
      fromPubkey: sender.publicKey,
      newAccountPubkey: nftKeypair.publicKey,
      space: MINT_SIZE,
      lamports: mintRent,
      programId: TOKEN_PROGRAM_ID,
    }),
    createInitializeMintInstruction(
      nftKeypair.publicKey,
      0,
      sender.publicKey,
      sender.publicKey,
    )
  );
  await program.provider.sendAndConfirm(createMintTx, [nftKeypair, sender]);


  // Get ATA address
  // Get ATA address
  const ata = await getAssociatedTokenAddress(
    nftKeypair.publicKey,
    sender.publicKey
  );


  // Create ATA and mint token
  const createAtaTx = new anchor.web3.Transaction().add(
    createAssociatedTokenAccountInstruction(
      sender.publicKey,
      ata,
      sender.publicKey,
      nftKeypair.publicKey
    ),
    createMintToInstruction(
      nftKeypair.publicKey,
      ata,
      sender.publicKey,
      1
    )
  );
  await program.provider.sendAndConfirm(createAtaTx, [sender]);
  // Get balance before the transaction
  const balanceBefore = await program.provider.connection.getBalance(sender.publicKey);


  // Get PDA for challenge and player accounts
  const [challengePda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("challenge"), Buffer.from(gameChallengeName)],
    program.programId
  );

  const [playerPda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("player"), sender.publicKey.toBuffer(), Buffer.from(gameChallengeName)],
    program.programId
  );

  const tx = await program.methods
    .claimChallenge(
      gameChallengeName,
    )
    .accounts({
      tokenAccount: ata,
      systemProgram: anchor.web3.SystemProgram.programId
    })
    .signers([sender])
    .rpc();
  // Get balance after the transaction
  const balanceAfter = await program.provider.connection.getBalance(sender.publicKey);
  const poolAccount = await program.account.challengeRegistryMetadata.fetch(
    anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("challenge"), Buffer.from(gameChallengeName)],
      program.programId
    )[0]
  );
  console.log("Stake challenge transaction signature:", tx);
  assert.equal(poolAccount.isActive, false);
  assert.equal(poolAccount.totalStaked.toString(), "0");
  // Account for some SOL being spent on transaction fees
  assert.isTrue(balanceAfter > balanceBefore);


});
