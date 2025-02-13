use anchor_lang::prelude::*;

declare_id!("419iiBDHAiLmbqJFk9H3iaEBk6E3hoHGyamX8k9G2aFd");

#[program]
pub mod challenge_registry_program {
    use super::*;

    pub fn create_challenge(
        ctx: Context<Challenge>,
        name: String,
        uri: String,
        nft: Pubkey,
    ) -> Result<()> {
        // Store the entry data
        let entry_account = &mut ctx.accounts.pda;
        let metadata = ChallengeRegistryMetadata {
            name,
            uri,
            nft,
            bump: ctx.bumps.pda,
        };
        entry_account.set_inner(metadata);
        msg!(
            "Game studio created successfully with entry PDA: {}",
            ctx.accounts.pda.key()
        );
        Ok(())
    }

    pub fn stake_challenge(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }

    pub fn claim_challenge(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}

#[account]
#[derive(Default)]
pub struct ChallengeRegistryMetadata {
    pub name: String,
    pub uri: String,
    pub nft: Pubkey,
    pub bump: u8,
}

#[derive(Accounts)]
#[instruction(
    name: String,
    uri: String,
    nft: Pubkey,
)]
pub struct Challenge<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        init,
        payer = payer,
        space = 8  // discriminator
            + 4 + 32  // name (String - 4 bytes for length + max 32 bytes for content)
            + 4 + 200 // uri (String - 4 bytes for length + max 200 bytes for content)
            + 32   // nft (single Pubkey)
            + 1,      // bump (u8)
        seeds = [b"challenge", entry_seed.key().as_ref()],
        bump
    )]
    pub pda: Account<'info, ChallengeRegistryMetadata>,

    /// CHECK: This is safe as we're just using it as a reference for PDA seeds
    pub entry_seed: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}
