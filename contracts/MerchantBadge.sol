// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MerchantBadge
 * @notice Non-transferable Soulbound Token (SBT) for verified ARC merchants
 * @dev One badge per wallet, non-transferable
 */
contract MerchantBadge is ERC721, Ownable {
    // Base URI for token metadata (IPFS)
    string private _baseTokenURI;
    
    // Mapping: merchant address -> token ID
    mapping(address => uint256) private _merchantToTokenId;
    
    // Mapping: token ID -> merchant address
    mapping(uint256 => address) private _tokenIdToMerchant;
    
    // Token ID counter
    uint256 private _tokenIdCounter;
    
    // Event emitted when a badge is minted
    event MerchantBadgeMinted(address indexed merchant, uint256 indexed tokenId);

    constructor(
        string memory name,
        string memory symbol,
        string memory baseTokenURI
    ) ERC721(name, symbol) Ownable(msg.sender) {
        _baseTokenURI = baseTokenURI;
        _tokenIdCounter = 1; // Start from 1
    }

    /**
     * @notice Mint a badge to a merchant (one per address)
     * @param merchant Address of the merchant (must be msg.sender)
     */
    function mint(address merchant) external {
        require(merchant != address(0), "MerchantBadge: invalid address");
        require(merchant == msg.sender, "MerchantBadge: can only mint to self");
        require(_merchantToTokenId[merchant] == 0, "MerchantBadge: badge already minted");
        
        uint256 tokenId = _tokenIdCounter;
        _tokenIdCounter++;
        
        _merchantToTokenId[merchant] = tokenId;
        _tokenIdToMerchant[tokenId] = merchant;
        
        _safeMint(merchant, tokenId);
        
        emit MerchantBadgeMinted(merchant, tokenId);
    }

    /**
     * @notice Check if a merchant has a badge
     * @param merchant Address of the merchant
     * @return tokenId Token ID if exists, 0 otherwise
     */
    function getBadgeTokenId(address merchant) external view returns (uint256) {
        return _merchantToTokenId[merchant];
    }

    /**
     * @notice Check if a merchant has a badge
     * @param merchant Address of the merchant
     * @return true if merchant has a badge
     */
    function hasBadge(address merchant) external view returns (bool) {
        return _merchantToTokenId[merchant] != 0;
    }

    /**
     * @notice Override transfer functions to make token non-transferable
     */
    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        // Only allow minting (from address(0))
        require(to != address(0) || auth == owner(), "MerchantBadge: non-transferable");
        return super._update(to, tokenId, auth);
    }

    /**
     * @notice Override approve to prevent transfers
     */
    function approve(address to, uint256 tokenId) public pure override {
        revert("MerchantBadge: non-transferable");
    }

    /**
     * @notice Override setApprovalForAll to prevent transfers
     */
    function setApprovalForAll(address operator, bool approved) public pure override {
        revert("MerchantBadge: non-transferable");
    }

    /**
     * @notice Override safeTransferFrom to prevent transfers
     */
    function safeTransferFrom(address from, address to, uint256 tokenId, bytes memory data) public pure override {
        revert("MerchantBadge: non-transferable");
    }

    /**
     * @notice Override transferFrom to prevent transfers
     */
    function transferFrom(address from, address to, uint256 tokenId) public pure override {
        revert("MerchantBadge: non-transferable");
    }

    /**
     * @notice Set base URI for token metadata
     */
    function setBaseURI(string memory baseTokenURI) external onlyOwner {
        _baseTokenURI = baseTokenURI;
    }

    /**
     * @notice Get base URI
     */
    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }
}
