// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/WeatherMarket.sol";

/// @dev Expose internal helpers for unit testing
contract WeatherMarketHarness is WeatherMarket {
    constructor(string memory _apiKey) WeatherMarket(_apiKey) {}

    function exposed_parseTemp(bytes calldata body) external pure returns (int256) {
        return _parseTemp(body);
    }

    function exposed_findSubstring(bytes calldata haystack, bytes calldata needle)
        external pure returns (uint256)
    {
        return _findSubstring(haystack, needle);
    }
}

contract WeatherMarketTest is Test {
    WeatherMarketHarness public market;

    address constant HTTP_PRECOMPILE = 0x0000000000000000000000000000000000000801;
    address constant TEE_REGISTRY    = 0x9644e8562cE0Fe12b4deeC4163c064A8862Bf47F;
    address constant MOCK_EXECUTOR   = address(0xE1EC70);

    address alice = makeAddr("alice");
    address bob   = makeAddr("bob");
    address carol = makeAddr("carol");

    function setUp() public {
        market = new WeatherMarketHarness("test_api_key");
        vm.deal(alice, 10 ether);
        vm.deal(bob,   10 ether);
        vm.deal(carol, 10 ether);
        vm.deal(address(market), 0); // start with empty contract balance
    }

    // ─── _parseTemp tests ────────────────────────────────────────────────────────

    function test_parseTemp_positive_decimal() public view {
        bytes memory body = bytes('{"coord":{},"main":{"temp":25.4,"feels_like":24.0,"temp_min":22.0,"temp_max":28.0},"name":"London"}');
        assertEq(market.exposed_parseTemp(body), 2540);
    }

    function test_parseTemp_negative_decimal() public view {
        bytes memory body = bytes('{"main":{"temp":-3.2,"feels_like":-4.5,"temp_min":-5.0,"temp_max":-1.0}}');
        assertEq(market.exposed_parseTemp(body), -320);
    }

    function test_parseTemp_integer() public view {
        bytes memory body = bytes('{"main":{"temp":20,"feels_like":19.5,"temp_min":18.0,"temp_max":22.0}}');
        assertEq(market.exposed_parseTemp(body), 2000);
    }

    function test_parseTemp_zero() public view {
        bytes memory body = bytes('{"main":{"temp":0.0,"feels_like":-1.0}}');
        assertEq(market.exposed_parseTemp(body), 0);
    }

    function test_parseTemp_single_decimal() public view {
        // "temp":5.6 → 560 (only one fractional digit → padded)
        bytes memory body = bytes('{"main":{"temp":5.6,"feels_like":4.0}}');
        assertEq(market.exposed_parseTemp(body), 560);
    }

    function test_parseTemp_ignores_temp_min_temp_max() public view {
        // First "temp": occurrence is the real temp, not temp_min or temp_max
        bytes memory body = bytes('{"main":{"temp":12.3,"feels_like":11.0,"temp_min":10.0,"temp_max":15.0}}');
        assertEq(market.exposed_parseTemp(body), 1230);
    }

    function test_findSubstring_found() public view {
        bytes memory hay    = bytes('hello world');
        bytes memory needle = bytes('world');
        assertEq(market.exposed_findSubstring(hay, needle), 6);
    }

    function test_findSubstring_not_found() public view {
        bytes memory hay    = bytes('hello world');
        bytes memory needle = bytes('xyz');
        assertEq(market.exposed_findSubstring(hay, needle), type(uint256).max);
    }

    // ─── Market creation ─────────────────────────────────────────────────────────

    function test_createMarket() public {
        uint256 dl = block.timestamp + 1 hours;
        uint256 rt = block.timestamp + 2 hours;
        uint256 id = market.createMarket("London,GB", 1500, dl, rt);
        assertEq(id, 0);
        assertEq(market.marketCount(), 1);

        (string memory city, int256 tgt,,,,,,,) = market.getMarket(0);
        assertEq(city, "London,GB");
        assertEq(tgt,  1500);
    }

    function test_createMarket_increments_id() public {
        uint256 dl = block.timestamp + 1 hours;
        uint256 rt = dl + 1 hours;
        uint256 id0 = market.createMarket("London,GB", 1500, dl, rt);
        uint256 id1 = market.createMarket("Tokyo,JP",  2500, dl, rt);
        assertEq(id0, 0);
        assertEq(id1, 1);
    }

    function test_createMarket_reverts_deadline_in_past() public {
        vm.expectRevert("Deadline in past");
        market.createMarket("London,GB", 1500, block.timestamp - 1, block.timestamp + 1);
    }

    function test_createMarket_reverts_resolution_before_deadline() public {
        uint256 dl = block.timestamp + 1 hours;
        vm.expectRevert("Resolution before deadline");
        market.createMarket("London,GB", 1500, dl, dl - 1);
    }

    // ─── Betting ─────────────────────────────────────────────────────────────────

    function test_placeBet_above_and_below() public {
        uint256 dl = block.timestamp + 1 hours;
        market.createMarket("Paris,FR", 2000, dl, dl + 1 hours);

        vm.prank(alice);
        market.placeBet{value: 1 ether}(0, true);

        vm.prank(bob);
        market.placeBet{value: 2 ether}(0, false);

        (,,,,uint256 totalAbove, uint256 totalBelow,,,) = market.getMarket(0);
        assertEq(totalAbove, 1 ether);
        assertEq(totalBelow, 2 ether);

        (uint256 ab, uint256 bl,) = market.getUserBets(0, alice);
        assertEq(ab, 1 ether);
        assertEq(bl, 0);

        (uint256 ab2, uint256 bl2,) = market.getUserBets(0, bob);
        assertEq(ab2, 0);
        assertEq(bl2, 2 ether);
    }

    function test_placeBet_accumulates() public {
        uint256 dl = block.timestamp + 1 hours;
        market.createMarket("Berlin,DE", 1000, dl, dl + 1 hours);

        vm.startPrank(alice);
        market.placeBet{value: 1 ether}(0, true);
        market.placeBet{value: 0.5 ether}(0, true);
        vm.stopPrank();

        (uint256 ab,,) = market.getUserBets(0, alice);
        assertEq(ab, 1.5 ether);
    }

    function test_placeBet_reverts_after_deadline() public {
        uint256 dl = block.timestamp + 1 hours;
        market.createMarket("Seoul,KR", 2500, dl, dl + 1 hours);
        vm.warp(dl + 1);

        vm.prank(alice);
        vm.expectRevert(WeatherMarket.BettingClosed.selector);
        market.placeBet{value: 1 ether}(0, true);
    }

    function test_placeBet_reverts_zero_value() public {
        uint256 dl = block.timestamp + 1 hours;
        market.createMarket("Seoul,KR", 2500, dl, dl + 1 hours);

        vm.prank(alice);
        vm.expectRevert("Bet must be > 0");
        market.placeBet{value: 0}(0, true);
    }

    // ─── Resolution with mocked HTTP precompile ───────────────────────────────────

    function _mockHTTPResponse(string memory weatherJson) internal {
        bytes memory httpBody    = bytes(weatherJson);
        bytes memory httpResponse = abi.encode(
            uint16(200),
            new string[](0),
            new string[](0),
            httpBody,
            "" // no error
        );
        bytes memory spcEnvelope = abi.encode(bytes(""), httpResponse);

        // Mock registry: return a valid executor
        vm.mockCall(
            TEE_REGISTRY,
            abi.encodeWithSignature(
                "pickServiceByCapability(uint8,bool,uint256,uint256)",
                uint8(0), true, block.timestamp, uint256(5)
            ),
            abi.encode(MOCK_EXECUTOR, true)
        );

        // Mock HTTP precompile: return settled weather data
        vm.mockCall(HTTP_PRECOMPILE, new bytes(0), spcEnvelope);
    }

    function _setupAndResolve(int256 targetTemp, string memory weatherJson)
        internal returns (uint256 marketId)
    {
        uint256 dl = block.timestamp + 1 hours;
        uint256 rt = block.timestamp + 2 hours;
        marketId = market.createMarket("London,GB", targetTemp, dl, rt);

        vm.prank(alice); market.placeBet{value: 1 ether}(marketId, true);
        vm.prank(bob);   market.placeBet{value: 1 ether}(marketId, false);

        vm.warp(rt + 1);
        _mockHTTPResponse(weatherJson);
        market.resolveMarket(marketId);
    }

    function test_resolveMarket_above() public {
        // Temp = 25.4°C, target = 20°C → above
        uint256 id = _setupAndResolve(
            2000,
            '{"coord":{"lon":-0.13},"main":{"temp":25.4,"feels_like":24.0,"temp_min":22.0,"temp_max":28.0},"name":"London"}'
        );
        (,,,,,,bool resolved, bool resultIsAbove, int256 actualTemp) = market.getMarket(id);
        assertTrue(resolved);
        assertEq(actualTemp, 2540);
        assertTrue(resultIsAbove);
    }

    function test_resolveMarket_below() public {
        // Temp = 12°C, target = 20°C → below
        uint256 id = _setupAndResolve(
            2000,
            '{"main":{"temp":12.0,"feels_like":10.5,"temp_min":10.0,"temp_max":14.0}}'
        );
        (,,,,,,bool resolved, bool resultIsAbove, int256 actualTemp) = market.getMarket(id);
        assertTrue(resolved);
        assertEq(actualTemp, 1200);
        assertFalse(resultIsAbove);
    }

    function test_resolveMarket_negative_temp() public {
        uint256 id = _setupAndResolve(
            0,
            '{"main":{"temp":-5.3,"feels_like":-8.0,"temp_min":-7.0,"temp_max":-3.0}}'
        );
        (,,,,,,bool resolved, bool resultIsAbove, int256 actualTemp) = market.getMarket(id);
        assertTrue(resolved);
        assertEq(actualTemp, -530);
        assertFalse(resultIsAbove); // -5.3 is NOT > 0
    }

    function test_resolveMarket_reverts_if_already_resolved() public {
        uint256 id = _setupAndResolve(
            2000,
            '{"main":{"temp":25.4,"feels_like":24.0,"temp_min":22.0,"temp_max":28.0}}'
        );
        vm.expectRevert(WeatherMarket.AlreadyResolved.selector);
        market.resolveMarket(id);
    }

    function test_resolveMarket_reverts_too_early() public {
        uint256 dl = block.timestamp + 1 hours;
        uint256 rt = block.timestamp + 2 hours;
        market.createMarket("London,GB", 2000, dl, rt);
        vm.prank(alice); market.placeBet{value: 1 ether}(0, true);

        vm.warp(dl + 1); // past betting deadline but before resolution time
        vm.expectRevert(WeatherMarket.NotYetResolvable.selector);
        market.resolveMarket(0);
    }

    // ─── Claim ──────────────────────────────────────────────────────────────────

    function test_claim_winner_takes_full_pot() public {
        // alice bets above 1 ETH, bob bets below 2 ETH, temp is above → alice wins all 3 ETH
        uint256 dl = block.timestamp + 1 hours;
        uint256 rt = block.timestamp + 2 hours;
        market.createMarket("London,GB", 2000, dl, rt);

        vm.prank(alice); market.placeBet{value: 1 ether}(0, true);
        vm.prank(bob);   market.placeBet{value: 2 ether}(0, false);

        vm.warp(rt + 1);
        _mockHTTPResponse('{"main":{"temp":25.0,"feels_like":24.0,"temp_min":22.0,"temp_max":28.0}}');
        market.resolveMarket(0);

        uint256 before = alice.balance;
        vm.prank(alice);
        market.claim(0);
        assertEq(alice.balance - before, 3 ether);

        (,, bool aliceClaimed) = market.getUserBets(0, alice);
        assertTrue(aliceClaimed);
    }

    function test_claim_proportional_payout() public {
        uint256 dl = block.timestamp + 1 hours;
        uint256 rt = block.timestamp + 2 hours;
        market.createMarket("London,GB", 2000, dl, rt);

        // alice and carol both bet above; bob bets below
        vm.prank(alice); market.placeBet{value: 1 ether}(0, true);
        vm.prank(carol); market.placeBet{value: 3 ether}(0, true);
        vm.prank(bob);   market.placeBet{value: 4 ether}(0, false);

        vm.warp(rt + 1);
        _mockHTTPResponse('{"main":{"temp":25.0,"feels_like":24.0,"temp_min":22.0,"temp_max":28.0}}');
        market.resolveMarket(0);

        // Total pot = 8 ETH, above pool = 4 ETH
        // alice's share = (1/4) * 8 = 2 ETH
        // carol's share = (3/4) * 8 = 6 ETH

        uint256 aliceBefore = alice.balance;
        vm.prank(alice); market.claim(0);
        assertEq(alice.balance - aliceBefore, 2 ether);

        uint256 carolBefore = carol.balance;
        vm.prank(carol); market.claim(0);
        assertEq(carol.balance - carolBefore, 6 ether);
    }

    function test_claim_loser_gets_nothing() public {
        uint256 dl = block.timestamp + 1 hours;
        uint256 rt = block.timestamp + 2 hours;
        market.createMarket("London,GB", 2000, dl, rt);

        vm.prank(alice); market.placeBet{value: 1 ether}(0, true);
        vm.prank(bob);   market.placeBet{value: 1 ether}(0, false);

        vm.warp(rt + 1);
        _mockHTTPResponse('{"main":{"temp":25.0,"feels_like":24.0}}'); // above → alice wins
        market.resolveMarket(0);

        vm.prank(bob);
        vm.expectRevert(WeatherMarket.NoWinnings.selector);
        market.claim(0);
    }

    function test_claim_reverts_double_claim() public {
        uint256 dl = block.timestamp + 1 hours;
        uint256 rt = block.timestamp + 2 hours;
        market.createMarket("London,GB", 2000, dl, rt);

        vm.prank(alice); market.placeBet{value: 1 ether}(0, true);
        vm.prank(bob);   market.placeBet{value: 1 ether}(0, false);

        vm.warp(rt + 1);
        _mockHTTPResponse('{"main":{"temp":25.0,"feels_like":24.0}}');
        market.resolveMarket(0);

        vm.prank(alice); market.claim(0);
        vm.prank(alice);
        vm.expectRevert(WeatherMarket.AlreadyClaimed.selector);
        market.claim(0);
    }

    function test_claim_refund_when_no_winning_side_bets() public {
        uint256 dl = block.timestamp + 1 hours;
        uint256 rt = block.timestamp + 2 hours;
        market.createMarket("London,GB", 2000, dl, rt);

        // Only below bets
        vm.prank(bob); market.placeBet{value: 2 ether}(0, false);

        vm.warp(rt + 1);
        // Temp is above → above wins, but totalAbove == 0
        // Edge case: refund the losing side (below bettors)
        _mockHTTPResponse('{"main":{"temp":25.0,"feels_like":24.0}}');
        market.resolveMarket(0);

        uint256 before = bob.balance;
        vm.prank(bob); market.claim(0);
        assertEq(bob.balance - before, 2 ether); // refunded
    }
}
