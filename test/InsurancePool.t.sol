// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/InsurancePool.sol";

// --- THIS IS THE FIX ---
import "./UserRegistry.t.sol";
// --- END FIX ---

contract InsurancePoolTest is Test {
    InsurancePool public insurance;
    MockUSDC public usdc;
    
    address public client = address(0x1);
    
    function setUp() public {
        usdc = new MockUSDC();
        insurance = new InsurancePool(address(usdc));
        
        usdc.mint(client, 10000 * 10**6);

        // --- ADDED FIX ---
        // Fund the pool so it can pay claims
        usdc.mint(address(insurance), 10000 * 10**6);
        // --- END FIX ---
    }
    
    function testBuyInsurance() public {
        vm.prank(client);
        usdc.approve(address(insurance), 50 * 10**6);
        
        vm.prank(client);
        uint256 policyId = insurance.buyInsurance(1, 1000 * 10**6);
        
        (address holder, uint256 projectId, uint256 coverage,,,) = insurance.getPolicy(policyId);
        
        assertEq(holder, client);
        assertEq(projectId, 1);
        assertEq(coverage, 1000 * 10**6);
    }
    
    function testFileClaim() public {
        vm.prank(client);
        usdc.approve(address(insurance), 50 * 10**6);
        
        vm.prank(client);
        uint256 policyId = insurance.buyInsurance(1, 1000 * 10**6);
        
        uint256 balanceBefore = usdc.balanceOf(client);
        
        vm.prank(client);
        insurance.fileClaim(policyId, 500 * 10**6);
        
        uint256 balanceAfter = usdc.balanceOf(client);
        assertEq(balanceAfter - balanceBefore, 500 * 10**6);
    }
    
    function testCannotClaimMoreThanCoverage() public {
        vm.prank(client);
        usdc.approve(address(insurance), 50 * 10**6);
        
        vm.prank(client);
        uint256 policyId = insurance.buyInsurance(1, 1000 * 10**6);
        
        vm.prank(client);
        vm.expectRevert(InsurancePool.ClaimExceedsCoverage.selector);
        insurance.fileClaim(policyId, 1500 * 10**6);
    }
}