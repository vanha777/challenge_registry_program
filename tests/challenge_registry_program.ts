import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { ChallengeRegistryProgram } from "../target/types/challenge_registry_program";
import { assert } from "chai";
const program = anchor.workspace.ChallengeRegistryProgram as Program<ChallengeRegistryProgram>;

// ===============================
// 🎮 Challenge Registry Tests
// ===============================
//
// Test Suite 1: Challenge Creation
// ----------------------------
// We're testing the fundamental ability to create a new challenge entry
// in the Challenge Registry. This is the cornerstone test that validates
// the core registration process for challenges joining the ecosystem.
//
// Critical aspects being validated:
// - PDA creation and storage
// - Metadata handling
// - Account structure integrity
// ===============================

it("Can create a challenge", async () => {
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
    .createChallenge(
      "Test Challenge",
      "https://test-studio.com/metadata.json",
      nftCollectionKeypair.publicKey,
    )
    .accounts({
      entrySeed: entrySeeds.publicKey,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .signers([sender])
    .rpc();

  console.log("Create studio transaction signature:", tx);

  // Fetch the created entry account and verify its data
  const entryAccount = await program.account.challengeRegistryMetadata.fetch(
    anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("challenge"), entrySeeds.publicKey.toBuffer()],
      program.programId
    )[0]
  );
  let test = entryAccount.nft.toBase58();
  console.log("Created studio :", test);
  assert.equal(entryAccount.name, "Test Challenge");
  assert.equal(entryAccount.uri, "https://test-studio.com/metadata.json");
  assert.equal(test, nftCollectionKeypair.publicKey.toBase58());
});
