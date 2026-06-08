// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IRitualWallet {
    function deposit(uint256 lockDuration) external payable;
    function balanceOf(address account) external view returns (uint256);
}

interface ITEEServiceRegistry {
    function pickServiceByCapability(
        uint8 capability,
        bool checkValidity,
        uint256 seed,
        uint256 maxProbes
    ) external view returns (address teeAddress, bool found);
}

/// @title WeatherMarket
/// @notice Prediction market: bet whether a city's temperature is above/below a target.
///         Resolution calls OpenWeather API directly via Ritual's HTTP precompile (0x0801) —
///         no oracle required. The TEE executor fetches weather data and settles on-chain.
contract WeatherMarket {
    // ─── Ritual system addresses ────────────────────────────────────────────────
    address constant HTTP_PRECOMPILE = 0x0000000000000000000000000000000000000801;
    address constant RITUAL_WALLET   = 0x532F0dF0896F353d8C3DD8cc134e8129DA2a3948;
    address constant TEE_REGISTRY    = 0x9644e8562cE0Fe12b4deeC4163c064A8862Bf47F;

    // ─── State ──────────────────────────────────────────────────────────────────
    struct Market {
        string city;
        int256 targetTemp;       // Celsius × 100  (e.g. 2500 = 25.00 °C)
        uint256 bettingDeadline; // timestamp: bets close after this
        uint256 resolutionTime;  // timestamp: earliest resolve call allowed
        uint256 totalAbove;      // total RITUAL bet on "above"
        uint256 totalBelow;      // total RITUAL bet on "below"
        bool resolved;
        bool resultIsAbove;      // true iff actualTemp > targetTemp
        int256 actualTemp;       // settled temperature × 100
        address creator;
    }

    mapping(uint256 => Market) public markets;
    mapping(uint256 => mapping(address => uint256)) public aboveBets;
    mapping(uint256 => mapping(address => uint256)) public belowBets;
    mapping(uint256 => mapping(address => bool))    public claimed;

    uint256 public marketCount;
    string  public apiKey;
    address public owner;

    // ─── Events ─────────────────────────────────────────────────────────────────
    event MarketCreated(
        uint256 indexed id,
        string  city,
        int256  targetTemp,
        uint256 bettingDeadline,
        uint256 resolutionTime
    );
    event BetPlaced(uint256 indexed id, address indexed bettor, bool isAbove, uint256 amount);
    event MarketResolved(uint256 indexed id, int256 actualTemp, bool resultIsAbove);
    event Claimed(uint256 indexed id, address indexed bettor, uint256 payout);

    // ─── Errors ─────────────────────────────────────────────────────────────────
    error NotOwner();
    error MarketNotFound();
    error BettingClosed();
    error AlreadyResolved();
    error NotYetResolvable();
    error NoBetsPlaced();
    error NoWinnings();
    error AlreadyClaimed();
    error TransferFailed();

    // ─── Constructor ─────────────────────────────────────────────────────────────
    constructor(string memory _apiKey) {
        owner  = msg.sender;
        apiKey = _apiKey;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    receive() external payable {}

    // ─── Admin ───────────────────────────────────────────────────────────────────

    /// @notice Deposit RITUAL into RitualWallet to cover HTTP executor fees.
    ///         Must be called before the first resolveMarket call.
    function depositFees() external payable {
        IRitualWallet(RITUAL_WALLET).deposit{value: msg.value}(100_000);
    }

    function setApiKey(string calldata _apiKey) external onlyOwner {
        apiKey = _apiKey;
    }

    // ─── Market lifecycle ────────────────────────────────────────────────────────

    /// @notice Create a new weather prediction market.
    /// @param city             OpenWeather city name (e.g. "London", "Tokyo,JP")
    /// @param targetTemp       Target temperature in Celsius × 100 (e.g. 2500 = 25.00 °C)
    /// @param bettingDeadline  Unix timestamp: bets close at this time
    /// @param resolutionTime   Unix timestamp: resolution allowed at/after this time
    function createMarket(
        string calldata city,
        int256 targetTemp,
        uint256 bettingDeadline,
        uint256 resolutionTime
    ) external returns (uint256 id) {
        require(bettingDeadline > block.timestamp, "Deadline in past");
        require(resolutionTime >= bettingDeadline, "Resolution before deadline");

        id = marketCount++;
        Market storage m = markets[id];
        m.city            = city;
        m.targetTemp      = targetTemp;
        m.bettingDeadline = bettingDeadline;
        m.resolutionTime  = resolutionTime;
        m.creator         = msg.sender;

        emit MarketCreated(id, city, targetTemp, bettingDeadline, resolutionTime);
    }

    /// @notice Place a bet. Send RITUAL as msg.value.
    /// @param marketId Market index
    /// @param isAbove  true = bet temp will be ABOVE target; false = BELOW or equal
    function placeBet(uint256 marketId, bool isAbove) external payable {
        if (marketId >= marketCount) revert MarketNotFound();
        Market storage m = markets[marketId];
        if (block.timestamp >= m.bettingDeadline) revert BettingClosed();
        if (m.resolved) revert AlreadyResolved();
        require(msg.value > 0, "Bet must be > 0");

        if (isAbove) {
            aboveBets[marketId][msg.sender] += msg.value;
            m.totalAbove += msg.value;
        } else {
            belowBets[marketId][msg.sender] += msg.value;
            m.totalBelow += msg.value;
        }
        emit BetPlaced(marketId, msg.sender, isAbove, msg.value);
    }

    /// @notice Resolve a market by calling OpenWeather via the HTTP precompile.
    ///         Uses Ritual's SPC (short-running async) model:
    ///           1. First execution (simulation): HTTP result is empty — returns early.
    ///           2. TEE executor fetches weather data off-chain.
    ///           3. Fulfilled replay: actual response injected — market settled on-chain.
    function resolveMarket(uint256 marketId) external {
        if (marketId >= marketCount) revert MarketNotFound();
        Market storage m = markets[marketId];
        if (m.resolved) revert AlreadyResolved();
        if (block.timestamp < m.resolutionTime) revert NotYetResolvable();
        if (m.totalAbove + m.totalBelow == 0) revert NoBetsPlaced();

        // Pick a valid HTTP executor from TEEServiceRegistry
        address executor = _getExecutor();

        // Build OpenWeather current weather URL (metric = Celsius)
        string memory url = string.concat(
            "https://api.openweathermap.org/data/2.5/weather?q=",
            m.city,
            "&units=metric&appid=",
            apiKey
        );

        // Encode the 13-field HTTP precompile request (ritual-dapp-http spec)
        bytes memory input = abi.encode(
            executor,           // executor: TEE node address
            new bytes[](0),     // encryptedSecrets: none
            uint256(100),       // ttl: 100 blocks
            new bytes[](0),     // secretSignatures: none
            bytes(""),          // userPublicKey: no response encryption
            url,                // url: OpenWeather endpoint
            uint8(1),           // method: GET = 1
            new string[](0),    // headerKeys
            new string[](0),    // headerValues
            bytes(""),          // body: empty for GET
            uint256(0),         // dkmsKeyIndex: disabled
            uint8(0),           // dkmsKeyFormat: disabled
            false               // piiEnabled: no
        );

        // Call the HTTP precompile
        (bool ok, bytes memory rawOutput) = HTTP_PRECOMPILE.call(input);
        require(ok, "HTTP precompile call failed");

        // Decode the SPC envelope: (simmedInput bytes, actualOutput bytes)
        (, bytes memory actualOutput) = abi.decode(rawOutput, (bytes, bytes));

        // Simulation phase: actualOutput is empty — exit without mutating state.
        // The block builder creates a commitment; the TEE executor fetches weather data.
        // This function will be re-executed (fulfilled replay) with real data injected.
        if (actualOutput.length == 0) return;

        // Fulfilled replay: decode the real HTTP response
        (
            uint16 statusCode,
            ,
            ,
            bytes memory body,
            string memory errMsg
        ) = abi.decode(actualOutput, (uint16, string[], string[], bytes, string));

        require(bytes(errMsg).length == 0, string.concat("Executor error: ", errMsg));
        require(statusCode == 200, "OpenWeather returned non-200 status");

        // Parse "temp" field from OpenWeather JSON (returns Celsius × 100)
        int256 actualTemp = _parseTemp(body);

        // Settle the market
        m.resolved    = true;
        m.actualTemp  = actualTemp;
        m.resultIsAbove = actualTemp > m.targetTemp;

        emit MarketResolved(marketId, actualTemp, m.resultIsAbove);
    }

    /// @notice Claim your payout from a resolved market.
    ///         Winners receive a proportional share of the total pot.
    ///         If one side has zero bets, the other side is refunded.
    function claim(uint256 marketId) external {
        if (marketId >= marketCount) revert MarketNotFound();
        Market storage m = markets[marketId];
        require(m.resolved, "Market not resolved yet");
        if (claimed[marketId][msg.sender]) revert AlreadyClaimed();

        uint256 userWinBet  = m.resultIsAbove ? aboveBets[marketId][msg.sender] : belowBets[marketId][msg.sender];
        uint256 userLoseBet = m.resultIsAbove ? belowBets[marketId][msg.sender] : aboveBets[marketId][msg.sender];
        uint256 winningTotal = m.resultIsAbove ? m.totalAbove : m.totalBelow;

        uint256 payout;
        if (winningTotal == 0) {
            // Edge case: no one bet on the winning side — refund the losing side
            if (userLoseBet == 0) revert NoWinnings();
            payout = userLoseBet;
        } else {
            if (userWinBet == 0) revert NoWinnings();
            uint256 totalPot = m.totalAbove + m.totalBelow;
            payout = (userWinBet * totalPot) / winningTotal;
        }

        claimed[marketId][msg.sender] = true;

        (bool success,) = msg.sender.call{value: payout}("");
        if (!success) revert TransferFailed();

        emit Claimed(marketId, msg.sender, payout);
    }

    // ─── View helpers ─────────────────────────────────────────────────────────────

    function getMarket(uint256 marketId) external view returns (
        string memory city,
        int256  targetTemp,
        uint256 bettingDeadline,
        uint256 resolutionTime,
        uint256 totalAbove,
        uint256 totalBelow,
        bool    resolved,
        bool    resultIsAbove,
        int256  actualTemp
    ) {
        if (marketId >= marketCount) revert MarketNotFound();
        Market storage m = markets[marketId];
        return (
            m.city, m.targetTemp, m.bettingDeadline, m.resolutionTime,
            m.totalAbove, m.totalBelow, m.resolved, m.resultIsAbove, m.actualTemp
        );
    }

    function getUserBets(uint256 marketId, address user) external view returns (
        uint256 aboveBet,
        uint256 belowBet,
        bool    hasClaimed
    ) {
        return (
            aboveBets[marketId][user],
            belowBets[marketId][user],
            claimed[marketId][user]
        );
    }

    // ─── Internal helpers ─────────────────────────────────────────────────────────

    /// @dev Query TEEServiceRegistry for an HTTP-capable executor.
    function _getExecutor() internal view returns (address) {
        (address teeAddr, bool found) = ITEEServiceRegistry(TEE_REGISTRY)
            .pickServiceByCapability(
                0,               // HTTP_CALL capability
                true,            // checkValidity
                block.timestamp, // seed (pseudo-random per block)
                5                // maxProbes
            );
        require(found, "No HTTP executor available");
        return teeAddr;
    }

    /// @dev Parse the "temp" field from an OpenWeather JSON response body.
    ///      Returns Celsius × 100 (e.g. 2540 for 25.40 °C, -320 for -3.20 °C).
    ///      Searches for the literal `"temp":` key; the first occurrence in
    ///      OpenWeather's response is always inside the "main" object.
    function _parseTemp(bytes memory body) internal pure returns (int256) {
        bytes memory needle = bytes('"temp":');
        uint256 pos = _findSubstring(body, needle);
        require(pos != type(uint256).max, "temp field not found in JSON response");
        pos += needle.length;

        bool  negative  = false;
        if (pos < body.length && body[pos] == 0x2D) { // '-'
            negative = true;
            pos++;
        }

        int256 intPart   = 0;
        int256 fracPart  = 0;
        uint8  fracDigits = 0;
        bool   inFrac    = false;

        while (pos < body.length) {
            uint8 c = uint8(body[pos]);
            if (c >= 0x30 && c <= 0x39) { // '0'–'9'
                if (inFrac) {
                    if (fracDigits < 2) {
                        fracPart = fracPart * 10 + int256(uint256(c - 0x30));
                        fracDigits++;
                    }
                    // ignore digits beyond 2 decimal places
                } else {
                    intPart = intPart * 10 + int256(uint256(c - 0x30));
                }
            } else if (c == 0x2E && !inFrac) { // '.'
                inFrac = true;
            } else {
                break; // end of number
            }
            pos++;
        }

        // Normalise to exactly 2 decimal digits
        while (fracDigits < 2) {
            fracPart  *= 10;
            fracDigits++;
        }

        int256 result = intPart * 100 + fracPart;
        return negative ? -result : result;
    }

    /// @dev Locate the first occurrence of `needle` in `haystack`.
    ///      Returns type(uint256).max if not found.
    function _findSubstring(bytes memory haystack, bytes memory needle)
        internal
        pure
        returns (uint256)
    {
        if (needle.length == 0 || needle.length > haystack.length) return type(uint256).max;
        uint256 limit = haystack.length - needle.length;
        for (uint256 i = 0; i <= limit; i++) {
            bool isMatch = true;
            for (uint256 j = 0; j < needle.length; j++) {
                if (haystack[i + j] != needle[j]) { isMatch = false; break; }
            }
            if (isMatch) return i;
        }
        return type(uint256).max;
    }
}
