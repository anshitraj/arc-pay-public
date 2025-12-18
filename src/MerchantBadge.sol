// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MerchantBadge
 * @notice Soulbound ERC-721 token for verified ARC merchants
 * @dev Non-transferable, one badge per wallet, issuer-controlled minting
 */
contract MerchantBadge is ERC721, Ownable {
    // Fixed IPFS metadata URI (IMMUTABLE)
    string private constant METADATA_URI = "ipfs://bafkreia4yiobvbpcg7tqoe4tybesotpbryyquwumtpefnjbgy2w4kntbhi";
    
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
        string memory symbol
    ) ERC721(name, symbol) Ownable(msg.sender) {
        _tokenIdCounter = 1; // Start from 1
    }

    /**
     * @notice Mint a badge to a merchant (owner only)
     * @param merchant Address of the merchant
     */
    function mint(address merchant) external onlyOwner {
        require(merchant != address(0), "MerchantBadge: invalid address");
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
     * @notice Override tokenURI to return fixed IPFS URI
     * @param tokenId Token ID
     * @return Fixed IPFS metadata URI
     */
    function tokenURI(uint256 tokenId) public pure override returns (string memory) {
        require(tokenId > 0, "MerchantBadge: invalid token ID");
        return METADATA_URI;
    }

    /**
     * @notice Override transferFrom to prevent transfers (soulbound)
     */
    function transferFrom(address, address, uint256) public pure override {
        revert("MerchantBadge: non-transferable");
    }

    /**
     * @notice Override safeTransferFrom to prevent transfers (soulbound)
     * Note: The 3-parameter version cannot be overridden as it's not virtual in OpenZeppelin v5
     * Transfers are prevented via _update override
     */
    // function safeTransferFrom(address, address, uint256) public pure {
    //     revert("MerchantBadge: non-transferable");
    // }

    /**
     * @notice Override safeTransferFrom to prevent transfers (soulbound)
     */
    function safeTransferFrom(address, address, uint256, bytes memory) public pure override {
        revert("MerchantBadge: non-transferable");
    }

    /**
     * @notice Override approve to prevent transfers
     */
    function approve(address, uint256) public pure override {
        revert("MerchantBadge: non-transferable");
    }

    /**
     * @notice Override setApprovalForAll to prevent transfers
     */
    function setApprovalForAll(address, bool) public pure override {
        revert("MerchantBadge: non-transferable");
    }

    /**
     * @notice Override _update to prevent transfers (except minting)
     */
    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        // Only allow minting (from address(0))
        if (to != address(0)) {
            revert("MerchantBadge: non-transferable");
        }
        return super._update(to, tokenId, auth);
    }
}

