// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {Script, console} from "forge-std/Script.sol";
import {MerchantBadge} from "../MerchantBadge.sol";

contract DeployMerchantBadge is Script {
    function run() external {
        vm.startBroadcast();

        MerchantBadge badge = new MerchantBadge(
            "ARC Verified Merchant",
            "ARCMB",
            "https://api.arcpaykit.com/badges/"
        );

        console.log("MerchantBadge deployed at:", address(badge));
        console.log("Name: ARC Verified Merchant");
        console.log("Symbol: ARCMB");

        vm.stopBroadcast();
    }
}
