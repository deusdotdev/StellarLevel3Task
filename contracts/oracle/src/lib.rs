#![no_std]

use soroban_sdk::{
    contract, contracterror, contractevent, contractimpl, contracttype, Address, Env, Symbol,
};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    Unauthorized = 3,
    UnknownSymbol = 4,
    OraclePaused = 5,
    StalePrice = 6,
    InvalidPrice = 7,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PriceData {
    pub price: i128,
    pub timestamp: u64,
    pub paused: bool,
}

#[contracttype]
#[derive(Clone)]
enum DataKey {
    Admin,
    Feed(Symbol),
}

#[contractevent]
pub struct PriceSet {
    #[topic]
    pub symbol: Symbol,
    pub price: i128,
    pub timestamp: u64,
}

#[contractevent]
pub struct FeedPaused {
    #[topic]
    pub symbol: Symbol,
    pub paused: bool,
}

#[contract]
pub struct Oracle;

#[contractimpl]
impl Oracle {
    pub fn initialize(env: Env, admin: Address) -> Result<(), Error> {
        if env.storage().instance().has(&DataKey::Admin) {
            return Err(Error::AlreadyInitialized);
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
        Ok(())
    }

    pub fn set_price(env: Env, symbol: Symbol, price: i128) -> Result<(), Error> {
        Self::require_admin(&env)?;
        if price <= 0 {
            return Err(Error::InvalidPrice);
        }
        let mut data = Self::read_feed(&env, &symbol).unwrap_or(PriceData {
            price: 0,
            timestamp: 0,
            paused: false,
        });
        data.price = price;
        data.timestamp = env.ledger().timestamp();
        env.storage()
            .persistent()
            .set(&DataKey::Feed(symbol.clone()), &data);
        PriceSet {
            symbol,
            price,
            timestamp: data.timestamp,
        }
        .publish(&env);
        Ok(())
    }

    pub fn set_paused(env: Env, symbol: Symbol, paused: bool) -> Result<(), Error> {
        Self::require_admin(&env)?;
        let mut data = Self::read_feed(&env, &symbol).ok_or(Error::UnknownSymbol)?;
        data.paused = paused;
        env.storage()
            .persistent()
            .set(&DataKey::Feed(symbol.clone()), &data);
        FeedPaused { symbol, paused }.publish(&env);
        Ok(())
    }

    pub fn last_price(env: Env, symbol: Symbol) -> Result<PriceData, Error> {
        Self::read_feed(&env, &symbol).ok_or(Error::UnknownSymbol)
    }

    /// Returns the tradable price or an error if the feed is missing, paused, or stale.
    pub fn require_fresh(env: Env, symbol: Symbol, max_age: u64) -> Result<i128, Error> {
        let data = Self::read_feed(&env, &symbol).ok_or(Error::UnknownSymbol)?;
        if data.paused {
            return Err(Error::OraclePaused);
        }
        let now = env.ledger().timestamp();
        if now < data.timestamp || now - data.timestamp > max_age {
            return Err(Error::StalePrice);
        }
        Ok(data.price)
    }

    pub fn admin(env: Env) -> Result<Address, Error> {
        env.storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(Error::NotInitialized)
    }
}

impl Oracle {
    fn require_admin(env: &Env) -> Result<(), Error> {
        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(Error::NotInitialized)?;
        admin.require_auth();
        Ok(())
    }

    fn read_feed(env: &Env, symbol: &Symbol) -> Option<PriceData> {
        env.storage()
            .persistent()
            .get(&DataKey::Feed(symbol.clone()))
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::testutils::{Address as _, Ledger};
    use soroban_sdk::symbol_short;

    fn setup() -> (Env, OracleClient<'static>, Address) {
        let env = Env::default();
        env.mock_all_auths();
        let admin = Address::generate(&env);
        let id = env.register(Oracle, ());
        let client = OracleClient::new(&env, &id);
        client.initialize(&admin);
        (env, client, admin)
    }

    #[test]
    fn set_and_read_price() {
        let (env, client, _admin) = setup();
        let sym = symbol_short!("ALPHA");
        client.set_price(&sym, &150_0000000);
        let data = client.last_price(&sym);
        assert_eq!(data.price, 150_0000000);
        assert_eq!(data.paused, false);
        assert_eq!(
            client.require_fresh(&sym, &3_600),
            150_0000000
        );
        let _ = env;
    }

    #[test]
    fn paused_and_stale_reject_trading() {
        let env = Env::default();
        env.mock_all_auths();
        env.ledger().set_timestamp(1_000);
        let admin = Address::generate(&env);
        let id = env.register(Oracle, ());
        let client = OracleClient::new(&env, &id);
        client.initialize(&admin);
        let sym = symbol_short!("INDEX");
        client.set_price(&sym, &80_0000000);
        client.set_paused(&sym, &true);
        assert_eq!(client.try_require_fresh(&sym, &3_600), Err(Ok(Error::OraclePaused)));
        client.set_paused(&sym, &false);
        env.ledger().set_timestamp(1_000 + 3_601);
        assert_eq!(client.try_require_fresh(&sym, &3_600), Err(Ok(Error::StalePrice)));
    }
}
