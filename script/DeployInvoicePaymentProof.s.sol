// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {Script, console} from "forge-std/Script.sol";
import {InvoicePaymentProof} from "../contracts/InvoicePaymentProof.sol";

contract DeployInvoicePaymentProof is Script {
    function run() external {
        vm.startBroadcast();

        // Deploy with msg.sender as owner (can be changed via setOwner if needed)
        InvoicePaymentProof proof = new InvoicePaymentProof(msg.sender);

        console.log("InvoicePaymentProof deployed at:", address(proof));
        console.log("Owner:", msg.sender);

        vm.stopBroadcast();
    }
}

