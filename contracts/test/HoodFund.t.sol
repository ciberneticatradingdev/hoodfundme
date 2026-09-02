// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Test} from "forge-std/Test.sol";
import {HoodFund, Vault} from "../src/HoodFund.sol";

contract HoodFundTest is Test {
    HoodFund fund;
    address creator = makeAddr("creator");
    address beneficiary = makeAddr("beneficiary");
    address feePayer = makeAddr("feePayer");
    address keeper = makeAddr("keeper");

    function setUp() public {
        fund = new HoodFund();
        vm.deal(feePayer, 100 ether);
        vm.deal(keeper, 1 ether);
    }

    function _create() internal returns (uint256 id, address vault) {
        vm.prank(creator);
        (id, vault) = fund.createCampaign("Save the Toads", "ipfs://meta", beneficiary);
    }

    function test_createCampaign() public {
        (uint256 id, address vault) = _create();
        assertEq(id, 0);
        HoodFund.Campaign memory c = fund.getCampaign(id);
        assertEq(c.creator, creator);
        assertEq(c.beneficiary, beneficiary);
        assertEq(c.vault, vault);
        assertTrue(c.active);
        assertEq(fund.vaultToCampaign(vault), 1);
    }

    function test_feesFlowToVault_thenFlushPaysBeneficiary() public {
        (uint256 id, address vault) = _create();

        vm.prank(feePayer);
        (bool ok, ) = vault.call{value: 3 ether}("");
        assertTrue(ok);
        assertEq(fund.pendingOf(id), 3 ether);

        vm.prank(keeper); // anyone can flush
        uint256 amount = fund.flush(id);
        assertEq(amount, 3 ether);
        assertEq(beneficiary.balance, 3 ether);
        assertEq(fund.pendingOf(id), 0);
        assertEq(fund.getCampaign(id).totalRaised, 3 ether);
    }

    function test_flushEmptyReverts() public {
        (uint256 id, ) = _create();
        vm.expectRevert(HoodFund.NothingToFlush.selector);
        fund.flush(id);
    }

    function test_flushUnknownReverts() public {
        vm.expectRevert(HoodFund.UnknownCampaign.selector);
        fund.flush(99);
    }

    function test_donateForwardsImmediately() public {
        (uint256 id, ) = _create();
        vm.prank(feePayer);
        fund.donate{value: 1 ether}(id);
        assertEq(beneficiary.balance, 1 ether);
        assertEq(fund.getCampaign(id).totalRaised, 1 ether);
    }

    function test_flushMany_skipsEmpty() public {
        (uint256 a, address vaultA) = _create();
        vm.prank(creator);
        (uint256 b, ) = fund.createCampaign("Second", "uri", beneficiary);

        vm.prank(feePayer);
        (bool ok, ) = vaultA.call{value: 2 ether}("");
        assertTrue(ok);

        uint256[] memory ids = new uint256[](2);
        ids[0] = a;
        ids[1] = b; // empty — must be skipped, not revert
        fund.flushMany(ids);
        assertEq(beneficiary.balance, 2 ether);
    }

    function test_onlyCreatorCanSetBeneficiary() public {
        (uint256 id, ) = _create();
        vm.prank(feePayer);
        vm.expectRevert(HoodFund.NotCreator.selector);
        fund.setBeneficiary(id, feePayer);

        address newBen = makeAddr("newBen");
        vm.prank(creator);
        fund.setBeneficiary(id, newBen);
        assertEq(fund.getCampaign(id).beneficiary, newBen);
    }

    function test_vaultSweepOnlyHoodFund() public {
        (, address vault) = _create();
        vm.prank(feePayer);
        vm.expectRevert(Vault.OnlyHoodFund.selector);
        Vault(payable(vault)).sweep(feePayer);
    }

    function test_zeroBeneficiaryReverts() public {
        vm.expectRevert(HoodFund.ZeroAddress.selector);
        fund.createCampaign("x", "y", address(0));
    }

    function testFuzz_flushExactAmounts(uint96 amount) public {
        vm.assume(amount > 0);
        (uint256 id, address vault) = _create();
        vm.deal(feePayer, amount);
        vm.prank(feePayer);
        (bool ok, ) = vault.call{value: amount}("");
        assertTrue(ok);
        fund.flush(id);
        assertEq(beneficiary.balance, amount);
    }
}
