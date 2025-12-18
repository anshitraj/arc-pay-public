// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {Script, console} from "forge-std/Script.sol";
import {MerchantBadge} from "../src/MerchantBadge.sol";

contract DeployMerchantBadge is Script {
    function run() external {
        vm.startBroadcast();

        MerchantBadge badge = new MerchantBadge(
            "Verified Merchant",
            "VM"
        );

        console.log("MerchantBadge deployed at:", address(badge));

        vm.stopBroadcast();
    }
}

