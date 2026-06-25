// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {IdentityRegistry} from "../src/IdentityRegistry.sol";

contract DeployERC8004 is Script {
    address constant WEATHER_MARKET = 0x072A3A0C04Cf8CDcaf5B4A73a4Ed4fF5A841531f;

    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(deployerKey);

        // 1. 部署 ERC-8004 IdentityRegistry
        IdentityRegistry registry = new IdentityRegistry();
        console.log("IdentityRegistry deployed:", address(registry));

        // 2. 構建 agentURI（JSON metadata）
        string memory agentURI = string(abi.encodePacked(
            '{"name":"WeatherMarket Agent",',
            '"description":"On-chain weather prediction market resolving via TEE HTTP Precompile",',
            '"associatedContract":"0x072A3A0C04Cf8CDcaf5B4A73a4Ed4fF5A841531f",',
            '"network":"Ritual Testnet","chainId":1979}'
        ));

        // 3. 構建 metadata 陣列
        IdentityRegistry.MetadataEntry[] memory meta = new IdentityRegistry.MetadataEntry[](3);
        meta[0] = IdentityRegistry.MetadataEntry({
            metadataKey: "description",
            metadataValue: bytes("On-chain weather prediction market resolving via TEE HTTP Precompile")
        });
        meta[1] = IdentityRegistry.MetadataEntry({
            metadataKey: "associatedContract",
            metadataValue: abi.encodePacked(WEATHER_MARKET)
        });
        meta[2] = IdentityRegistry.MetadataEntry({
            metadataKey: "agentType",
            metadataValue: bytes("WeatherOracle")
        });

        // 4. 呼叫 register()，agentId 從 0 開始
        uint256 agentId = registry.register(agentURI, meta);
        console.log("Agent registered! agentId:", agentId);
        console.log("IdentityRegistry:", address(registry));

        vm.stopBroadcast();

        console.log("");
        console.log("=== ERC-8004 Registration Summary ===");
        console.log("Registry:    ", address(registry));
        console.log("Agent ID:    ", agentId);
        console.log("Agent name:  WeatherMarket Agent");
        console.log("Associated:  0x072A3A0C04Cf8CDcaf5B4A73a4Ed4fF5A841531f");
        console.log("Chain ID:    1979 (Ritual Testnet)");
    }
}
