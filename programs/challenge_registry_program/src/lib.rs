use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount};

declare_id!("419iiBDHAiLmbqJFk9H3iaEBk6E3hoHGyamX8k9G2aFd");

#[program]
pub mod challenge_registry_program {
    use super::*;

    pub fn create_challenge(
        ctx: Context<Challenge>,
        name: String,
        uri: String,
        nft: Pubkey,
        require_stake: u64,
    ) -> Result<()> {
        // Store the entry data
        let entry_account = &mut ctx.accounts.pda;
        let metadata = ChallengeRegistryMetadata {
            name,
            uri,
            nft,
            total_staked: 0,
            require_stake,
            is_active: true,
            bump: ctx.bumps.pda,
        };
        entry_account.set_inner(metadata);
        msg!(
            "Game studio created successfully with entry PDA: {}",
            ctx.accounts.pda.key()
        );
        Ok(())
    }

    pub fn stake_challenge(
        ctx: Context<StakeChallenge>,
        challenge_name: String,
        amount: u64,
    ) -> Result<()> {
        let player_pda = &mut ctx.accounts.player;
        player_pda.player = ctx.accounts.payer.key();
        player_pda.stake_amount = amount;
        player_pda.bump = ctx.bumps.player;

        // Transfer SOL from payer to pool PDA
        let ix = anchor_lang::solana_program::system_instruction::transfer(
            &ctx.accounts.payer.key(),
            &ctx.accounts.pool_pda.key(),
            amount,
        );
        anchor_lang::solana_program::program::invoke(
            &ix,
            &[
                ctx.accounts.payer.to_account_info(),
                ctx.accounts.pool_pda.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
        )?;

        // Update total staked amount in pool
        ctx.accounts.pool_pda.total_staked += amount;

        msg!("Player staked {} amount", amount);
        Ok(())
    }
    pub fn claim_challenge(ctx: Context<ClaimChallenge>, challenge_name: String) -> Result<()> {
        let token_account = TokenAccount::try_deserialize(
            &mut ctx.accounts.token_account.try_borrow_data()?.as_ref(),
        )
        .map_err(|_| ErrorCode::ConstraintAddress)?;

        // Add the token account to the context validation
        // require!(
        //     token_account_data.owner.key() == ctx.accounts.payer.key()
        //     token_account_data.owner.key() == ctx.accounts.payer.key()
        //         && token_account_data.mint == ctx.accounts.pool_pda.nft
        //         && token_account_data.amount > 0,
        //     ErrorCode::ConstraintAddress
        // );
        require!(
            token_account.owner == ctx.accounts.payer.key()
                && token_account.mint == ctx.accounts.pool_pda.nft
                && token_account.amount > 0,
            ErrorCode::ConstraintAccountIsNone
        );

        // Transfer staked SOL from pool back to player
        let amount = ctx.accounts.pool_pda.total_staked;
        **ctx
            .accounts
            .pool_pda
            .to_account_info()
            .try_borrow_mut_lamports()? -= amount;
        **ctx
            .accounts
            .payer
            .to_account_info()
            .try_borrow_mut_lamports()? += amount;

        // Update state
        let pool_pda = &mut ctx.accounts.pool_pda;
        pool_pda.is_active = false;
        pool_pda.total_staked = 0;

        msg!("Challenge claimed successfully");
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
    pub total_staked: u64,  // Total staked amount
    pub require_stake: u64, // Require stake amount
    pub is_active: bool,
    pub bump: u8,
}

#[account]
#[derive(Default)]
pub struct PlayerMetadata {
    pub player: Pubkey,
    pub stake_amount: u64,
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
            + 8    // total_staked (u64)
            + 8    // require_stake (u64)
            + 1    // is_active (bool)
            + 1,      // bump (u8)
        seeds = [b"challenge", name.as_bytes()],
        bump
    )]
    pub pda: Account<'info, ChallengeRegistryMetadata>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(
    challenge_name: String,
    amount: u64,
)]
pub struct StakeChallenge<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(
        mut,
        seeds = [b"challenge", challenge_name.as_bytes()],
        bump = pool_pda.bump,
        constraint = !pool_pda.name.trim().is_empty() @ ErrorCode::ConstraintAccountIsNone
    )]
    pub pool_pda: Account<'info, ChallengeRegistryMetadata>,
    #[account(
        init,
        payer = payer,
        space = 8  // discriminator
            + 32   // player public address (single Pubkey)
            + 8    // stake_amount (u64)
            + 1,      // bump (u8)
        seeds = [b"player", payer.key().as_ref(),challenge_name.as_bytes()],
        bump
    )]
    pub player: Account<'info, PlayerMetadata>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(
    challenge_name: String,
)]
pub struct ClaimChallenge<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(
        mut,
        seeds = [b"challenge", challenge_name.as_bytes()],
        bump = pool_pda.bump,
        constraint = pool_pda.is_active == true @ ErrorCode::RequireNeqViolated
    )]
    pub pool_pda: Account<'info, ChallengeRegistryMetadata>,
    #[account(
        mut,
        seeds = [b"player", payer.key().as_ref(),challenge_name.as_bytes()],
        bump = player_pda.bump,
        constraint = player_pda.stake_amount != 0 @ ErrorCode::ConstraintHasOne
    )]
    pub player_pda: Account<'info, PlayerMetadata>,
    /// CHECK: We validate the token account in the instruction
    #[account(mut)]
    pub token_account: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}
