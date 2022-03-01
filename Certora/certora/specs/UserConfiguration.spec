methods {
	setBorrowing(uint256, bool) envfree
	setUsingAsCollateral(uint256, bool) envfree
	isUsingAsCollateralOrBorrowing(uint256) returns bool envfree
	isBorrowing(uint256) returns bool envfree
	isUsingAsCollateral(uint256) returns bool envfree
	isBorrowingAny() returns bool envfree
 	isEmpty() returns bool envfree
	isUsingAsCollateralAny() returns bool envfree
	isUsingAsCollateralOne() returns bool envfree
	isIsolated() returns bool envfree
}

invariant empty(uint256 reserveIndex) 
	 isEmpty() => !isBorrowingAny() && !isUsingAsCollateralOrBorrowing(reserveIndex)

invariant notEmpty(uint256 reserveIndex) 
	(isBorrowingAny() ||  isUsingAsCollateral(reserveIndex)) => !isEmpty()


invariant borrowing(uint256 reserveIndex ) 
	 isBorrowing(reserveIndex) =>  isBorrowingAny() 

invariant collateralOrBorrowing(uint256 reserveIndex ) 
	(isUsingAsCollateral(reserveIndex) || isBorrowing(reserveIndex)) <=>  isUsingAsCollateralOrBorrowing(reserveIndex) 

invariant isolated(calldataarg args)
    !isUsingAsCollateralOne() => !isIsolated()

rule setBorrowing(uint256 reserveIndex, bool borrowing)
{
	require reserveIndex < 128;
	
	setBorrowing(reserveIndex, borrowing);
	assert isBorrowing(reserveIndex) == borrowing, "unexpected result";
}

rule setBorrowingNoChangeToOther(uint256 reserveIndex, uint256 reserveIndexOther, bool borrowing)
{
	require reserveIndexOther != reserveIndex;
	require reserveIndexOther < 128 && reserveIndex < 128;
	bool otherReserveBorrowing =  isBorrowing(reserveIndexOther);
	bool otherReserveCollateral = isUsingAsCollateral(reserveIndexOther);

	setBorrowing(reserveIndex, borrowing);
	assert otherReserveBorrowing == isBorrowing(reserveIndexOther) &&
		otherReserveCollateral == isUsingAsCollateral(reserveIndexOther), "changed to other reserve";
}


rule  setUsingAsCollateral(uint256 reserveIndex, bool usingAsCollateral)
{
	require reserveIndex < 128;
	
	setUsingAsCollateral(reserveIndex, usingAsCollateral);
	assert isUsingAsCollateral(reserveIndex) == usingAsCollateral, "unexpected result";
}


rule setUsingAsCollateralNoChangeToOther(uint256 reserveIndex, uint256 reserveIndexOther, bool usingAsCollateral)
{
	require reserveIndexOther != reserveIndex;
	require reserveIndexOther < 128 && reserveIndex < 128;
	bool otherReserveBorrowing = isBorrowing(reserveIndexOther);
	bool otherReserveCollateral = isUsingAsCollateral(reserveIndexOther);
	
	setUsingAsCollateral(reserveIndex, usingAsCollateral);
	assert otherReserveBorrowing == isBorrowing(reserveIndexOther) &&
		otherReserveCollateral == isUsingAsCollateral(reserveIndexOther), "changed to other reserve";
}
