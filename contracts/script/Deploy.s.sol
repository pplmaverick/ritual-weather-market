// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {WeatherMarket} from "../src/WeatherMarket.sol";

contract Deploy is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        string memory apiKey = vm.envString("OPENWEATHER_API_KEY");

        vm.startBroadcast(deployerKey);

        WeatherMarket market = new WeatherMarket(apiKey);
        console.log("WeatherMarket deployed to:", address(market));

        // Deposit 0.5 RITUAL into RitualWallet to cover HTTP executor fees.
        // The HTTP precompile fee = BASE_FEE + (input_bytes * 0.35 gwei) + (output_bytes * 0.35 gwei)
        // OpenWeather responses are ~400 bytes; 0.1 RITUAL covers ~40 resolve calls.
        market.depositFees{value: 0.1 ether}();
        console.log("Deposited 0.1 RITUAL into RitualWallet for executor fees");

        vm.stopBroadcast();

        console.log("");
        console.log("=== Next steps ===");
        console.log("1. Add to frontend/.env.local:");
        console.log("   NEXT_PUBLIC_MARKET_ADDRESS=", address(market));
        console.log("2. cd frontend && npm install && npm run dev");
    }
}
