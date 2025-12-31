// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {Script, console} from "forge-std/Script.sol";
import {PaymentRegistry} from "../PaymentRegistry.sol";

contract DeployPaymentRegistry is Script {
    function run() external {
        vm.startBroadcast();

        PaymentRegistry registry = new PaymentRegistry();

        console.log("PaymentRegistry deployed at:", address(registry));

        vm.stopBroadcast();
    }
}
