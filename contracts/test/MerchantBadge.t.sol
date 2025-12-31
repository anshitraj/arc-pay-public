// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console} from "forge-std/Test.sol";
import {MerchantBadge} from "../MerchantBadge.sol";

contract MerchantBadgeTest is Test {
    MerchantBadge public badge;
    address public owner;
    address public merchant;

    function setUp() public {
        owner = address(this);
        merchant = address(0x1);
        
        badge = new MerchantBadge(
            "ARC Merchant Badge",
            "ARCMB",
            "https://api.arcpaykit.com/badges/"
        );
    }

    function testMintBadge() public {
        vm.prank(merchant);
        badge.mint(merchant);

        assertTrue(badge.hasBadge(merchant));
        uint256 tokenId = badge.getBadgeTokenId(merchant);
        assertGt(tokenId, 0);
        assertEq(badge.ownerOf(tokenId), merchant);
    }

    function testCannotMintTwice() public {
        vm.startPrank(merchant);
        badge.mint(merchant);
        
        vm.expectRevert("MerchantBadge: badge already minted");
        badge.mint(merchant);
        vm.stopPrank();
    }

    function testCannotMintToDifferentAddress() public {
        address otherMerchant = address(0x2);
        
        vm.prank(merchant);
        vm.expectRevert("MerchantBadge: can only mint to self");
        badge.mint(otherMerchant);
    }

    function testCannotTransferBadge() public {
        vm.prank(merchant);
        badge.mint(merchant);
        
        uint256 tokenId = badge.getBadgeTokenId(merchant);
        address recipient = address(0x3);

        vm.prank(merchant);
        vm.expectRevert("MerchantBadge: non-transferable");
        badge.transferFrom(merchant, recipient, tokenId);
    }

    function testCannotApprove() public {
        vm.prank(merchant);
        badge.mint(merchant);
        
        uint256 tokenId = badge.getBadgeTokenId(merchant);
        address spender = address(0x3);

        vm.prank(merchant);
        vm.expectRevert("MerchantBadge: non-transferable");
        badge.approve(spender, tokenId);
    }

    function testCannotSetApprovalForAll() public {
        vm.prank(merchant);
        badge.mint(merchant);
        
        address operator = address(0x3);

        vm.prank(merchant);
        vm.expectRevert("MerchantBadge: non-transferable");
        badge.setApprovalForAll(operator, true);
    }

    function testOwnerCanSetBaseURI() public {
        string memory newURI = "https://new-api.arcpaykit.com/badges/";
        badge.setBaseURI(newURI);
        
        // Base URI is internal, but we can verify it doesn't revert
        assertTrue(true);
    }

    function testNonOwnerCannotSetBaseURI() public {
        address nonOwner = address(0x999);
        string memory newURI = "https://new-api.arcpaykit.com/badges/";

        vm.prank(nonOwner);
        vm.expectRevert();
        badge.setBaseURI(newURI);
    }
}
