import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { ChallengeRegistryProgram } from "../target/types/challenge_registry_program";

const program = anchor.workspace.MetalootRegistryProgram as Program<MetalootRegistryProgram>;

// ===============================
// 🎮 Game Studio Registry Tests
// ===============================
//
// Test Suite 1: Studio Creation
// ----------------------------
// We're testing the fundamental ability to create a new game studio entry
// in the MetaLoot registry. This is the cornerstone test that validates
// the core registration process for game studios joining the ecosystem.
//
// Critical aspects being validated:
// - PDA creation and storage
// - Metadata handling
// - Account structure integrity
// ===============================

it("Can create a studio with Tokens and NFT collection", async () => {
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
  const testKeypair = anchor.web3.Keypair.generate();
  const entrySeeds = anchor.web3.Keypair.generate();
  const nativeTokenKeypair = anchor.web3.Keypair.generate();
  const nftCollectionKeypair = anchor.web3.Keypair.generate();

  const entry_account = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("registry"), entrySeeds.publicKey.toBuffer()],
    program.programId
  )[0];
  // Create the studio with full metadata
  const tx = await program.methods
    .createGameStudio(
      "Test Studio",
      "TEST",
      "https://test-studio.com/metadata.json",
      sender.publicKey,
      nativeTokenKeypair.publicKey,
      [nftCollectionKeypair.publicKey]
    )
    .accounts({
      entrySeed: entrySeeds.publicKey,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .signers([sender])
    .rpc();

  console.log("Create studio transaction signature:", tx);

  // Fetch the created entry account and verify its data
  const entryAccount = await program.account.gameRegistryMetadata.fetch(
    anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("registry"), entrySeeds.publicKey.toBuffer()],
      program.programId
    )[0]
  );
  let test = entryAccount.nftCollection.map(key => key.toBase58());
  console.log("Created studio :", test);
  assert.equal(entryAccount.name, "Test Studio");
  assert.equal(entryAccount.symbol, "TEST");
  assert.equal(entryAccount.uri, "https://test-studio.com/metadata.json");
  assert.equal(entryAccount.authority.toBase58(), program.provider.publicKey.toBase58());
  assert.equal(entryAccount.nativeToken.toBase58(), nativeTokenKeypair.publicKey.toBase58());
  // Fix: Compare arrays of Base58 strings
  assert.deepEqual(
    entryAccount.nftCollection.map(key => key.toBase58()),
    [nftCollectionKeypair.publicKey.toBase58()]
  );
});
