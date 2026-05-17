
import "dotenv/config";
import { prisma } from "../src/index";

const assets = [
  {
    title: "Bitcoin",
    symbol: "BTC",
    decimals: 8,
    imgurl: "https://cryptologos.cc/logos/bitcoin-btc-logo.png"
  },
  {
    title: "Ethereum",
    symbol: "ETH",
    decimals: 18,
    imgurl: "https://cryptologos.cc/logos/ethereum-eth-logo.png"
  },
  {
    title: "Solana",
    symbol: "SOL",
    decimals: 9,
    imgurl: "https://cryptologos.cc/logos/solana-sol-logo.png"
  },
  {
    title: "BNB",
    symbol: "BNB",
    decimals: 18,
    imgurl: "https://cryptologos.cc/logos/bnb-bnb-logo.png"
  },
  {
    title: "Ripple",
    symbol: "XRP",
    decimals: 6,
    imgurl: "https://cryptologos.cc/logos/xrp-xrp-logo.png"
  },
  {
    title: "Dogecoin",
    symbol: "DOGE",
    decimals: 8,
    imgurl: "https://cryptologos.cc/logos/dogecoin-doge-logo.png"
  },
  {
    title: "Cardano",
    symbol: "ADA",
    decimals: 6,
    imgurl: "https://cryptologos.cc/logos/cardano-ada-logo.png"
  },
  {
    title: "Polygon",
    symbol: "MATIC",
    decimals: 18,
    imgurl: "https://cryptologos.cc/logos/polygon-matic-logo.png"
  },
  {
    title: "USD Tether",
    symbol: "USDT",
    decimals: 6,
    imgurl: "https://cryptologos.cc/logos/tether-usdt-logo.png"
  },
  {
    title: "USD Coin",
    symbol: "USDC",
    decimals: 6,
    imgurl: "https://cryptologos.cc/logos/usd-coin-usdc-logo.png"
  }
];

async function seed() {
  await prisma.asset.createMany({
    data: assets
  });

  console.log("Assets seeded");
}

seed()
  .catch(console.error)
  .finally(async () => {
    console.log("completed")
  });
