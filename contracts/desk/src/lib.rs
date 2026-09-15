#![no_std]

use soroban_sdk::{
    contract, contractclient, contracterror, contractevent, contractimpl, contracttype, Address, Env,
    Symbol,
};

pub const SCALE: i128 = 10_000_000;
pub const DEFAULT_MAX_AGE: u64 = 3_600;

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PriceData {
    pub price: i128,
    pub timestamp: u64,
    pub paused: bool,
}

#[contractclient(name = "CashClient")]
pub trait CashTrait {
    fn transfer(env: Env, from: Address, to: Address, amount: i128);
    fn transfer_from(env: Env, spender: Address, from: Address, to: Address, amount: i128);
}

#[contractclient(name = "EquityClient")]
pub trait EquityTrait {
    fn mint(env: Env, to: Address, amount: i128);
    fn desk_burn(env: Env, from: Address, amount: i128);
}

#[contractclient(name = "OracleClient")]
pub trait OracleTrait {
    fn last_price(env: Env, symbol: Symbol) -> PriceData;
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    Unauthorized = 3,
    InvalidAmount = 4,
    UnknownMarket = 5,
    WindowClosed = 6,
    OraclePaused = 7,
    StalePrice = 8,
    UnknownSymbol = 9,
    InvalidPrice = 10,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Market {
    pub equity: Address,
    pub listed: bool,
}

#[contracttype]
#[derive(Clone)]
enum DataKey {
    Admin,
    Cash,
    Oracle,
    WindowOpen,
    MaxAge,
    Market(Symbol),
}

#[contractevent]
pub struct Minted {
    #[topic]
    pub user: Address,
    #[topic]
    pub symbol: Symbol,
    pub raw_amount: i128,
    pub cost: i128,
    pub price: i128,
}

#[contractevent]
pub struct Redeemed {
    #[topic]
    pub user: Address,
    #[topic]
    pub symbol: Symbol,
    pub raw_amount: i128,
    pub payout: i128,
    pub price: i128,
}

#[contractevent]
pub struct WindowSet {
    pub open: bool,
}

#[contractevent]
pub struct MarketListed {
    #[topic]
    pub symbol: Symbol,
    pub equity: Address,
}

#[contract]
pub struct Desk;

#[contractimpl]
impl Desk {
    pub fn initialize(env: Env, admin: Address, cash: Address, oracle: Address) -> Result<(), Error> {
        if env.storage().instance().has(&DataKey::Admin) {
            return Err(Error::AlreadyInitialized);
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Cash, &cash);
        env.storage().instance().set(&DataKey::Oracle, &oracle);
        env.storage().instance().set(&DataKey::WindowOpen, &true);
        env.storage().instance().set(&DataKey::MaxAge, &DEFAULT_MAX_AGE);
        Ok(())
    }

    pub fn list_market(env: Env, symbol: Symbol, equity: Address) -> Result<(), Error> {
        Self::require_admin(&env)?;
        env.storage().instance().set(
            &DataKey::Market(symbol.clone()),
            &Market {
                equity: equity.clone(),
                listed: true,
            },
        );
        MarketListed { symbol, equity }.publish(&env);
        Ok(())
    }

    pub fn set_window(env: Env, open: bool) -> Result<(), Error> {
        Self::require_admin(&env)?;
        env.storage().instance().set(&DataKey::WindowOpen, &open);
        WindowSet { open }.publish(&env);
        Ok(())
    }

    pub fn set_max_age(env: Env, max_age: u64) -> Result<(), Error> {
        Self::require_admin(&env)?;
        env.storage().instance().set(&DataKey::MaxAge, &max_age);
        Ok(())
    }

    pub fn mint(env: Env, user: Address, symbol: Symbol, raw_amount: i128) -> Result<i128, Error> {
        user.require_auth();
        Self::require_window(&env)?;
        Self::require_positive(raw_amount)?;
        let price = Self::fresh_price(&env, &symbol)?;
        let cost = mul_div(raw_amount, price)?;
        let market = Self::market(&env, &symbol)?;
        let cash_id: Address = env.storage().instance().get(&DataKey::Cash).unwrap();
        let desk = env.current_contract_address();
        CashClient::new(&env, &cash_id).transfer_from(&desk, &user, &desk, &cost);
        EquityClient::new(&env, &market.equity).mint(&user, &raw_amount);
        Minted {
            user,
            symbol,
            raw_amount,
            cost,
            price,
        }
        .publish(&env);
        Ok(cost)
    }

    pub fn redeem(env: Env, user: Address, symbol: Symbol, raw_amount: i128) -> Result<i128, Error> {
        user.require_auth();
        Self::require_window(&env)?;
        Self::require_positive(raw_amount)?;
        let price = Self::fresh_price(&env, &symbol)?;
        let payout = mul_div(raw_amount, price)?;
        let market = Self::market(&env, &symbol)?;
        EquityClient::new(&env, &market.equity).desk_burn(&user, &raw_amount);
        let cash_id: Address = env.storage().instance().get(&DataKey::Cash).unwrap();
        let desk = env.current_contract_address();
        CashClient::new(&env, &cash_id).transfer(&desk, &user, &payout);
        Redeemed {
            user,
            symbol,
            raw_amount,
            payout,
            price,
        }
        .publish(&env);
        Ok(payout)
    }

    pub fn quote(env: Env, symbol: Symbol, raw_amount: i128) -> Result<i128, Error> {
        Self::require_positive(raw_amount)?;
        let price = Self::fresh_price(&env, &symbol)?;
        mul_div(raw_amount, price)
    }

    pub fn window_open(env: Env) -> bool {
        env.storage()
            .instance()
            .get(&DataKey::WindowOpen)
            .unwrap_or(false)
    }

    pub fn get_market(env: Env, symbol: Symbol) -> Result<Market, Error> {
        Self::market(&env, &symbol)
    }

    pub fn cash(env: Env) -> Address {
        env.storage().instance().get(&DataKey::Cash).unwrap()
    }

    pub fn oracle(env: Env) -> Address {
        env.storage().instance().get(&DataKey::Oracle).unwrap()
    }

    pub fn admin(env: Env) -> Result<Address, Error> {
        env.storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(Error::NotInitialized)
    }
}

impl Desk {
    fn require_admin(env: &Env) -> Result<(), Error> {
        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(Error::NotInitialized)?;
        admin.require_auth();
        Ok(())
    }

    fn require_window(env: &Env) -> Result<(), Error> {
        let open: bool = env
            .storage()
            .instance()
            .get(&DataKey::WindowOpen)
            .unwrap_or(false);
        if open {
            Ok(())
        } else {
            Err(Error::WindowClosed)
        }
    }

    fn require_positive(amount: i128) -> Result<(), Error> {
        if amount <= 0 {
            Err(Error::InvalidAmount)
        } else {
            Ok(())
        }
    }

    fn market(env: &Env, symbol: &Symbol) -> Result<Market, Error> {
        env.storage()
            .instance()
            .get(&DataKey::Market(symbol.clone()))
            .ok_or(Error::UnknownMarket)
    }

    fn fresh_price(env: &Env, symbol: &Symbol) -> Result<i128, Error> {
        let oracle_id: Address = env
            .storage()
            .instance()
            .get(&DataKey::Oracle)
            .ok_or(Error::NotInitialized)?;
        let max_age: u64 = env
            .storage()
            .instance()
            .get(&DataKey::MaxAge)
            .unwrap_or(DEFAULT_MAX_AGE);
        let oracle = OracleClient::new(env, &oracle_id);
        let data = match oracle.try_last_price(symbol) {
            Ok(Ok(data)) => data,
            _ => return Err(Error::UnknownSymbol),
        };
        if data.paused {
            return Err(Error::OraclePaused);
        }
        let now = env.ledger().timestamp();
        if now < data.timestamp || now - data.timestamp > max_age {
            return Err(Error::StalePrice);
        }
        Ok(data.price)
    }
}

fn mul_div(raw: i128, price: i128) -> Result<i128, Error> {
    raw.checked_mul(price)
        .and_then(|v| v.checked_div(SCALE))
        .filter(|v| *v > 0)
        .ok_or(Error::InvalidAmount)
}

#[cfg(test)]
mod test {
    use super::{Desk, DeskClient, Error};
    use cash::{Cash, CashClient};
    use equity::{Equity, EquityClient};
    use oracle::{Oracle, OracleClient};
    use soroban_sdk::testutils::{Address as _, Ledger};
    use soroban_sdk::{symbol_short, Address, Env, String, Symbol};

    struct Ctx {
        env: Env,
        admin: Address,
        user: Address,
        cash: CashClient<'static>,
        oracle: OracleClient<'static>,
        equity: EquityClient<'static>,
        desk: DeskClient<'static>,
        desk_id: Address,
        alpha: Symbol,
    }

    fn setup() -> Ctx {
        let env = Env::default();
        env.mock_all_auths();
        env.ledger().set_timestamp(50_000);
        let admin = Address::generate(&env);
        let user = Address::generate(&env);

        let cash_id = env.register(Cash, ());
        let cash = CashClient::new(&env, &cash_id);
        cash.initialize(&admin);

        let oracle_id = env.register(Oracle, ());
        let oracle = OracleClient::new(&env, &oracle_id);
        oracle.initialize(&admin);

        let equity_id = env.register(Equity, ());
        let equity = EquityClient::new(&env, &equity_id);
        equity.initialize(
            &admin,
            &String::from_str(&env, "EQ Alpha"),
            &String::from_str(&env, "ALPHA"),
        );

        let desk_id = env.register(Desk, ());
        let desk = DeskClient::new(&env, &desk_id);
        desk.initialize(&admin, &cash_id, &oracle_id);
        equity.set_minter(&desk_id);

        let alpha = symbol_short!("ALPHA");
        desk.list_market(&alpha, &equity_id);
        oracle.set_price(&alpha, &150_0000000);

        Ctx {
            env,
            admin,
            user,
            cash,
            oracle,
            equity,
            desk,
            desk_id,
            alpha,
        }
    }

    #[test]
    fn mint_pulls_cash_and_credits_equity() {
        let ctx = setup();
        ctx.cash.faucet(&ctx.user);
        ctx.cash.approve(&ctx.user, &ctx.desk_id, &500_0000000);
        let cost = ctx.desk.mint(&ctx.user, &ctx.alpha, &2_0000000);
        assert_eq!(cost, 300_0000000);
        assert_eq!(ctx.equity.balance(&ctx.user), 2_0000000);
        assert_eq!(ctx.cash.balance(&ctx.user), cash::FAUCET_AMOUNT - 300_0000000);
        assert_eq!(ctx.cash.balance(&ctx.desk_id), 300_0000000);
    }

    #[test]
    fn redeem_returns_cash_at_oracle_price() {
        let ctx = setup();
        ctx.cash.faucet(&ctx.user);
        ctx.cash.approve(&ctx.user, &ctx.desk_id, &500_0000000);
        ctx.desk.mint(&ctx.user, &ctx.alpha, &2_0000000);
        let payout = ctx.desk.redeem(&ctx.user, &ctx.alpha, &1_0000000);
        assert_eq!(payout, 150_0000000);
        assert_eq!(ctx.equity.balance(&ctx.user), 1_0000000);
        assert_eq!(ctx.cash.balance(&ctx.desk_id), 150_0000000);
    }

    #[test]
    fn closed_window_and_stale_oracle_block_mint() {
        let ctx = setup();
        ctx.cash.faucet(&ctx.user);
        ctx.cash.approve(&ctx.user, &ctx.desk_id, &500_0000000);
        ctx.desk.set_window(&false);
        assert_eq!(
            ctx.desk.try_mint(&ctx.user, &ctx.alpha, &1_0000000),
            Err(Ok(Error::WindowClosed))
        );
        ctx.desk.set_window(&true);
        ctx.env.ledger().set_timestamp(50_000 + 4_000);
        assert_eq!(
            ctx.desk.try_mint(&ctx.user, &ctx.alpha, &1_0000000),
            Err(Ok(Error::StalePrice))
        );
    }

    #[test]
    fn paused_oracle_blocks_mint() {
        let ctx = setup();
        ctx.cash.faucet(&ctx.user);
        ctx.cash.approve(&ctx.user, &ctx.desk_id, &500_0000000);
        ctx.oracle.set_paused(&ctx.alpha, &true);
        assert_eq!(
            ctx.desk.try_mint(&ctx.user, &ctx.alpha, &1_0000000),
            Err(Ok(Error::OraclePaused))
        );
    }

    #[test]
    fn quote_matches_mint_cost() {
        let ctx = setup();
        assert_eq!(ctx.desk.quote(&ctx.alpha, &2_0000000), 300_0000000);
        let _ = ctx.admin;
    }
}
