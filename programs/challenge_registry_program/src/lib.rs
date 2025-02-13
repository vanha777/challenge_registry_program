use anchor_lang::prelude::*;

declare_id!("419iiBDHAiLmbqJFk9H3iaEBk6E3hoHGyamX8k9G2aFd");

#[program]
pub mod challenge_registry_program {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
