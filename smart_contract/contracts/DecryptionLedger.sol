// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract DecryptionLedger {
    struct DecryptionRecord {
        bytes32 watermarkId;
        address recipient;
        bytes signature;      // Dilithium signature (stored as bytes, verified off-chain)
        bytes32 docHash;
        uint256 timestamp;
    }

    mapping(bytes32 => DecryptionRecord) public records; // watermarkId => record
    bytes32[] public watermarkIds;

    // Key Revocation: 0 = not revoked, else revocation timestamp
    mapping(address => uint256) public revokedAt;

    event RecordCommitted(bytes32 indexed watermarkId, address indexed recipient, uint256 timestamp);
    event RecipientRevoked(address indexed recipient, uint256 timestamp);

    function commitRecord(
        bytes32 _watermarkId,
        address _recipient,
        bytes calldata _signature,
        bytes32 _docHash
    ) external {
        require(records[_watermarkId].timestamp == 0, "Record already exists");

        records[_watermarkId] = DecryptionRecord({
            watermarkId: _watermarkId,
            recipient: _recipient,
            signature: _signature,
            docHash: _docHash,
            timestamp: block.timestamp
        });

        watermarkIds.push(_watermarkId);
        emit RecordCommitted(_watermarkId, _recipient, block.timestamp);
    }

    function getRecord(bytes32 _watermarkId) external view returns (DecryptionRecord memory) {
        return records[_watermarkId];
    }

    function totalRecords() external view returns (uint256) {
        return watermarkIds.length;
    }

    /// @notice Revoke a recipient's key — marks them as compromised from this timestamp forward
    function revokeRecipient(address _recipient) external {
        require(revokedAt[_recipient] == 0, "Already revoked");
        revokedAt[_recipient] = block.timestamp;
        emit RecipientRevoked(_recipient, block.timestamp);
    }

    function isRevoked(address _recipient, uint256 _atTimestamp) external view returns (bool) {
        return revokedAt[_recipient] != 0 && _atTimestamp >= revokedAt[_recipient];
    }

    /// @notice Check if a recipient is currently revoked (regardless of timestamp)
    function isCurrentlyRevoked(address _recipient) external view returns (bool) {
        return revokedAt[_recipient] != 0;
    }
}