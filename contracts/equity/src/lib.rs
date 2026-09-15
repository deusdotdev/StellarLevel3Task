#![no_std]

use soroban_sdk::{
    contract, contracterror, contractevent, contractimpl, contracttype, Address, Env, String,
};

/// 1.0 in 7-decimal fixed point. Raw balances stay still; UI shares = raw * multiplier / SCALE.
pub const SCALE: i128 = 10_000_000;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    Unauthorized = 3,
    InvalidAmount = 4,
    InsufficientBalance = 5,
    InvalidMultiplier = 6,
    MinterNotSet = 7,
}

#[contracttype]
#[derive(Clone)]
enum DataKey {
    Admin,
    Minter,
    Name,
    Symbol,
    Multiplier,
    Balance(Address),
}

#[contractevent]
pub struct Transfer {
    #[topic]
    pub from: Address,
    #[topic]
    pub to: Address,
    pub amount: i128,
}

#[contractevent]
pub struct Mint {
    #[topic]
    pub to: Address,
    pub amount: i128,
}

#[contractevent]
pub struct Burn {
    #[topic]
    pub from: Address,
    pub amount: i128,
}

#[contractevent]
pub struct MultiplierUpdated {
    pub old_multiplier: i128,
    pub new_multiplier: i128,
}

#[contract]
pub struct Equity;

#[contractimpl]
impl Equity {
    pub fn initialize(
        env: Env,
        admin: Address,
        name: String,
        symbol: String,
    ) -> Result<(), Error> {
        if env.storage().instance().has(&DataKey::Admin) {
            return Err(Error::AlreadyInitialized);
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Name, &name);
        env.storage().instance().set(&DataKey::Symbol, &symbol);
        env.storage().instance().set(&DataKey::Multiplier, &SCALE);
        Ok(())
    }

    pub fn set_minter(env: Env, minter: Address) -> Result<(), Error> {
        Self::require_admin(&env)?;
        env.storage().instance().set(&DataKey::Minter, &minter);
        Ok(())
    }

    pub fn mint(env: Env, to: Address, amount: i128) -> Result<(), Error> {
        Self::require_minter(&env)?;
        Self::require_positive(amount)?;
        Self::credit(&env, &to, amount);
        Mint { to, amount }.publish(&env);
        Ok(())
    }

    /// Called by the primary desk during redeem. Holder and minter both authorize.
    pub fn desk_burn(env: Env, from: Address, amount: i128) -> Result<(), Error> {
        from.require_auth();
        Self::require_minter(&env)?;
        Self::require_positive(amount)?;
        Self::debit(&env, &from, amount)?;
        Burn { from, amount }.publish(&env);
        Ok(())
    }

    pub fn transfer(env: Env, from: Address, to: Address, amount: i128) -> Result<(), Error> {
        from.require_auth();
        Self::require_positive(amount)?;
        Self::debit(&env, &from, amount)?;
        Self::credit(&env, &to, amount);
        Transfer {
            from,
            to,
            amount,
        }
        .publish(&env);
        Ok(())
    }

    pub fn set_multiplier(env: Env, new_multiplier: i128) -> Result<(), Error> {
        Self::require_admin(&env)?;
        if new_multiplier <= 0 {
            return Err(Error::InvalidMultiplier);
        }
        let old: i128 = env
            .storage()
            .instance()
            .get(&DataKey::Multiplier)
            .unwrap_or(SCALE);
        env.storage()
            .instance()
            .set(&DataKey::Multiplier, &new_multiplier);
        MultiplierUpdated {
            old_multiplier: old,
            new_multiplier,
        }
        .publish(&env);
        Ok(())
    }

    pub fn multiplier(env: Env) -> i128 {
        env.storage()
            .instance()
            .get(&DataKey::Multiplier)
            .unwrap_or(SCALE)
    }

    pub fn balance(env: Env, id: Address) -> i128 {
        env.storage()
            .persistent()
            .get(&DataKey::Balance(id))
            .unwrap_or(0)
    }

    /// Underlying-share view: raw * multiplier / SCALE. Does not change storage.
    pub fn balance_ui(env: Env, id: Address) -> i128 {
        let raw = Self::balance(env.clone(), id);
        let m = Self::multiplier(env);
        raw.checked_mul(m).unwrap_or(0) / SCALE
    }

    pub fn decimals(_env: Env) -> u32 {
        7
    }

    pub fn name(env: Env) -> String {
        env.storage()
            .instance()
            .get(&DataKey::Name)
            .unwrap_or(String::from_str(&env, "EQ"))
    }

    pub fn symbol(env: Env) -> String {
        env.storage()
            .instance()
            .get(&DataKey::Symbol)
            .unwrap_or(String::from_str(&env, "EQ"))
    }

    pub fn minter(env: Env) -> Result<Address, Error> {
        env.storage()
            .instance()
            .get(&DataKey::Minter)
            .ok_or(Error::MinterNotSet)
    }
}

impl Equity {
    fn require_admin(env: &Env) -> Result<(), Error> {
        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(Error::NotInitialized)?;
        admin.require_auth();
        Ok(())
    }

    fn require_minter(env: &Env) -> Result<(), Error> {
        let minter: Address = env
            .storage()
            .instance()
            .get(&DataKey::Minter)
            .ok_or(Error::MinterNotSet)?;
        minter.require_auth();
        Ok(())
    }

    fn require_positive(amount: i128) -> Result<(), Error> {
        if amount <= 0 {
            Err(Error::InvalidAmount)
        } else {
            Ok(())
        }
    }

    fn credit(env: &Env, to: &Address, amount: i128) {
        let key = DataKey::Balance(to.clone());
        let bal: i128 = env.storage().persistent().get(&key).unwrap_or(0);
        env.storage().persistent().set(&key, &(bal + amount));
    }

    fn debit(env: &Env, from: &Address, amount: i128) -> Result<(), Error> {
        let key = DataKey::Balance(from.clone());
        let bal: i128 = env.storage().persistent().get(&key).unwrap_or(0);
        if bal < amount {
            return Err(Error::InsufficientBalance);
        }
        env.storage().persistent().set(&key, &(bal - amount));
        Ok(())
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::testutils::Address as _;

    fn setup() -> (Env, EquityClient<'static>, Address, Address) {
        let env = Env::default();
        env.mock_all_auths();
        let admin = Address::generate(&env);
        let minter = Address::generate(&env);
        let id = env.register(Equity, ());
        let client = EquityClient::new(&env, &id);
        client.initialize(
            &admin,
            &String::from_str(&env, "EQ Alpha"),
            &String::from_str(&env, "ALPHA"),
        );
        client.set_minter(&minter);
        (env, client, admin, minter)
    }

    #[test]
    fn mint_and_ui_balance_scale_with_multiplier() {
        let (env, client, _admin, _minter) = setup();
        let user = Address::generate(&env);
        client.mint(&user, &2_0000000);
        assert_eq!(client.balance(&user), 2_0000000);
        assert_eq!(client.balance_ui(&user), 2_0000000);
        // Simulated reinvested dividend: 1 token now represents 1.03 shares.
        client.set_multiplier(&10_300_000);
        assert_eq!(client.balance(&user), 2_0000000);
        assert_eq!(client.balance_ui(&user), 2_0600000);
    }

    #[test]
    fn desk_burn_reduces_supply() {
        let (env, client, _admin, _minter) = setup();
        let user = Address::generate(&env);
        client.mint(&user, &5_0000000);
        client.desk_burn(&user, &2_0000000);
        assert_eq!(client.balance(&user), 3_0000000);
    }
}
