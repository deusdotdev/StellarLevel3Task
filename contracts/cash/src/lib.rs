#![no_std]

use soroban_sdk::{
    contract, contracterror, contractevent, contractimpl, contracttype, Address, Env, String,
};

pub const DECIMALS: u32 = 7;
pub const FAUCET_AMOUNT: i128 = 10_000 * 10_000_000; // 10,000 mUSD

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    Unauthorized = 3,
    InvalidAmount = 4,
    InsufficientBalance = 5,
    InsufficientAllowance = 6,
}

#[contracttype]
#[derive(Clone)]
enum DataKey {
    Admin,
    Balance(Address),
    Allowance(Address, Address),
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
pub struct Approve {
    #[topic]
    pub from: Address,
    #[topic]
    pub spender: Address,
    pub amount: i128,
}

#[contract]
pub struct Cash;

#[contractimpl]
impl Cash {
    pub fn initialize(env: Env, admin: Address) -> Result<(), Error> {
        if env.storage().instance().has(&DataKey::Admin) {
            return Err(Error::AlreadyInitialized);
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
        Ok(())
    }

    pub fn faucet(env: Env, to: Address) -> Result<(), Error> {
        to.require_auth();
        Self::require_init(&env)?;
        Self::credit(&env, &to, FAUCET_AMOUNT);
        Mint {
            to,
            amount: FAUCET_AMOUNT,
        }
        .publish(&env);
        Ok(())
    }

    pub fn mint(env: Env, to: Address, amount: i128) -> Result<(), Error> {
        Self::require_admin(&env)?;
        Self::require_positive(amount)?;
        Self::credit(&env, &to, amount);
        Mint { to, amount }.publish(&env);
        Ok(())
    }

    pub fn transfer(env: Env, from: Address, to: Address, amount: i128) -> Result<(), Error> {
        from.require_auth();
        Self::move_tokens(&env, &from, &to, amount)
    }

    pub fn approve(env: Env, from: Address, spender: Address, amount: i128) -> Result<(), Error> {
        from.require_auth();
        Self::require_init(&env)?;
        if amount < 0 {
            return Err(Error::InvalidAmount);
        }
        env.storage()
            .persistent()
            .set(&DataKey::Allowance(from.clone(), spender.clone()), &amount);
        Approve {
            from,
            spender,
            amount,
        }
        .publish(&env);
        Ok(())
    }

    pub fn transfer_from(
        env: Env,
        spender: Address,
        from: Address,
        to: Address,
        amount: i128,
    ) -> Result<(), Error> {
        spender.require_auth();
        Self::spend_allowance(&env, &from, &spender, amount)?;
        Self::move_tokens(&env, &from, &to, amount)
    }

    pub fn balance(env: Env, id: Address) -> i128 {
        env.storage()
            .persistent()
            .get(&DataKey::Balance(id))
            .unwrap_or(0)
    }

    pub fn allowance(env: Env, from: Address, spender: Address) -> i128 {
        env.storage()
            .persistent()
            .get(&DataKey::Allowance(from, spender))
            .unwrap_or(0)
    }

    pub fn decimals(_env: Env) -> u32 {
        DECIMALS
    }

    pub fn name(env: Env) -> String {
        String::from_str(&env, "Mock USD")
    }

    pub fn symbol(env: Env) -> String {
        String::from_str(&env, "mUSD")
    }

    pub fn admin(env: Env) -> Result<Address, Error> {
        env.storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(Error::NotInitialized)
    }
}

impl Cash {
    fn require_init(env: &Env) -> Result<(), Error> {
        if env.storage().instance().has(&DataKey::Admin) {
            Ok(())
        } else {
            Err(Error::NotInitialized)
        }
    }

    fn require_admin(env: &Env) -> Result<(), Error> {
        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(Error::NotInitialized)?;
        admin.require_auth();
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

    fn move_tokens(env: &Env, from: &Address, to: &Address, amount: i128) -> Result<(), Error> {
        Self::require_init(env)?;
        Self::require_positive(amount)?;
        let from_key = DataKey::Balance(from.clone());
        let from_bal: i128 = env.storage().persistent().get(&from_key).unwrap_or(0);
        if from_bal < amount {
            return Err(Error::InsufficientBalance);
        }
        env.storage().persistent().set(&from_key, &(from_bal - amount));
        Self::credit(env, to, amount);
        Transfer {
            from: from.clone(),
            to: to.clone(),
            amount,
        }
        .publish(env);
        Ok(())
    }

    fn spend_allowance(
        env: &Env,
        from: &Address,
        spender: &Address,
        amount: i128,
    ) -> Result<(), Error> {
        let key = DataKey::Allowance(from.clone(), spender.clone());
        let allowed: i128 = env.storage().persistent().get(&key).unwrap_or(0);
        if allowed < amount {
            return Err(Error::InsufficientAllowance);
        }
        env.storage().persistent().set(&key, &(allowed - amount));
        Ok(())
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::testutils::Address as _;

    fn setup() -> (Env, CashClient<'static>, Address, Address) {
        let env = Env::default();
        env.mock_all_auths();
        let admin = Address::generate(&env);
        let user = Address::generate(&env);
        let id = env.register(Cash, ());
        let client = CashClient::new(&env, &id);
        client.initialize(&admin);
        (env, client, admin, user)
    }

    #[test]
    fn faucet_credits_user() {
        let (_env, client, _admin, user) = setup();
        client.faucet(&user);
        assert_eq!(client.balance(&user), FAUCET_AMOUNT);
    }

    #[test]
    fn transfer_and_approve_work() {
        let (env, client, _admin, user) = setup();
        let other = Address::generate(&env);
        client.faucet(&user);
        client.transfer(&user, &other, &1_000_0000);
        assert_eq!(client.balance(&other), 1_000_0000);
        client.approve(&user, &other, &500_0000);
        assert_eq!(client.allowance(&user, &other), 500_0000);
        client.transfer_from(&other, &user, &other, &200_0000);
        assert_eq!(client.balance(&other), 1_200_0000);
        assert_eq!(client.allowance(&user, &other), 300_0000);
    }

    #[test]
    fn rejects_double_init_and_overdraw() {
        let (env, client, admin, user) = setup();
        assert_eq!(client.try_initialize(&admin), Err(Ok(Error::AlreadyInitialized)));
        client.faucet(&user);
        let other = Address::generate(&env);
        assert_eq!(
            client.try_transfer(&user, &other, &(FAUCET_AMOUNT + 1)),
            Err(Ok(Error::InsufficientBalance))
        );
    }
}
