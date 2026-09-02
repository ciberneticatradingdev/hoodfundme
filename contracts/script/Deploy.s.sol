// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Script, console} from "forge-std/Script.sol";
import {HoodFund} from "../src/HoodFund.sol";

contract Deploy is Script {
    function run() external {
        uint256 pk = vm.envUint("DEPLOYER_PK");
        vm.startBroadcast(pk);
        HoodFund fund = new HoodFund();
        vm.stopBroadcast();
        console.log("HoodFund deployed:", address(fund));
    }
}
