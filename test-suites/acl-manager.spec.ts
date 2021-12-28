import { expect } from 'chai';
import { constants, utils } from 'ethers';
import { ZERO_ADDRESS } from '../helpers/constants';
import { ACLManager, ACLManager__factory } from '../types';
import { makeSuite, TestEnv } from './helpers/make-suite';
import { ProtocolErrors } from '../helpers/types';

makeSuite('Access Control List Manager', (testEnv: TestEnv) => {
  let aclManager: ACLManager;

  const FLASH_BORROW_ADMIN_ROLE = utils.keccak256(
    utils.formatBytes32String('FLASH_BORROWER_ADMIN')
  );

  before(async () => {
    const { deployer, addressesProvider } = testEnv;
    aclManager = await new ACLManager__factory(deployer.signer).deploy(addressesProvider.address);
  });

  it('Check DEFAULT_ADMIN_ROLE', async () => {
    const { deployer, users } = testEnv;

    const DEFAULT_ADMIN_ROLE = await aclManager.DEFAULT_ADMIN_ROLE();
    expect(await aclManager.hasRole(DEFAULT_ADMIN_ROLE, deployer.address)).to.be.eq(true);
    expect(await aclManager.hasRole(DEFAULT_ADMIN_ROLE, users[0].address)).to.be.eq(false);
  });

  it('Grant FLASH_BORROW_ADMIN role', async () => {
    const {
      deployer,
      users: [flashBorrowAdmin],
    } = testEnv;

    expect(await aclManager.hasRole(FLASH_BORROW_ADMIN_ROLE, flashBorrowAdmin.address)).to.be.eq(
      false
    );
    await aclManager
      .connect(deployer.signer)
      .grantRole(FLASH_BORROW_ADMIN_ROLE, flashBorrowAdmin.address);
    expect(await aclManager.hasRole(FLASH_BORROW_ADMIN_ROLE, flashBorrowAdmin.address)).to.be.eq(
      true
    );
  });

  it('FLASH_BORROW_ADMIN grant FLASH_BORROW_ROLE (revert expected)', async () => {
    const {
      users: [flashBorrowAdmin, flashBorrower],
    } = testEnv;

    expect(await aclManager.isFlashBorrower(flashBorrower.address)).to.be.eq(false);
    expect(await aclManager.hasRole(FLASH_BORROW_ADMIN_ROLE, flashBorrowAdmin.address)).to.be.eq(
      true
    );

    await expect(
      aclManager.connect(flashBorrowAdmin.signer).addFlashBorrower(flashBorrower.address)
    ).to.be.revertedWith(
      `'AccessControl: account ${flashBorrowAdmin.address.toLowerCase()} is missing role ${
        constants.HashZero
      }'`
    );

    expect(await aclManager.isFlashBorrower(flashBorrower.address)).to.be.eq(false);
    expect(await aclManager.hasRole(FLASH_BORROW_ADMIN_ROLE, flashBorrowAdmin.address)).to.be.eq(
      true
    );
  });

  it('Make FLASH_BORROW_ADMIN_ROLE admin of FLASH_BORROWER_ROLE', async () => {
    const { deployer } = testEnv;
    const FLASH_BORROW_ROLE = await aclManager.FLASH_BORROWER_ROLE();
    expect(await aclManager.getRoleAdmin(FLASH_BORROW_ROLE)).to.not.be.eq(FLASH_BORROW_ADMIN_ROLE);
    await aclManager
      .connect(deployer.signer)
      .setRoleAdmin(FLASH_BORROW_ROLE, FLASH_BORROW_ADMIN_ROLE);
    expect(await aclManager.getRoleAdmin(FLASH_BORROW_ROLE)).to.be.eq(FLASH_BORROW_ADMIN_ROLE);
  });

  it('FLASH_BORROW_ADMIN grant FLASH_BORROW_ROLE', async () => {
    const {
      users: [flashBorrowAdmin, flashBorrower],
    } = testEnv;

    expect(await aclManager.isFlashBorrower(flashBorrower.address)).to.be.eq(false);
    expect(await aclManager.hasRole(FLASH_BORROW_ADMIN_ROLE, flashBorrowAdmin.address)).to.be.eq(
      true
    );

    await aclManager.connect(flashBorrowAdmin.signer).addFlashBorrower(flashBorrower.address);

    expect(await aclManager.isFlashBorrower(flashBorrower.address)).to.be.eq(true);
    expect(await aclManager.hasRole(FLASH_BORROW_ADMIN_ROLE, flashBorrowAdmin.address)).to.be.eq(
      true
    );
  });

  it('DEFAULT_ADMIN tries to revoke FLASH_BORROW_ROLE (revert expected)', async () => {
    const {
      deployer,
      users: [flashBorrowAdmin, flashBorrower],
    } = testEnv;

    expect(await aclManager.isFlashBorrower(flashBorrower.address)).to.be.eq(true);
    expect(await aclManager.hasRole(FLASH_BORROW_ADMIN_ROLE, flashBorrowAdmin.address)).to.be.eq(
      true
    );

    await expect(
      aclManager.connect(deployer.signer).removeFlashBorrower(flashBorrower.address)
    ).to.be.revertedWith(
      `'AccessControl: account ${deployer.address.toLowerCase()} is missing role ${FLASH_BORROW_ADMIN_ROLE}'`
    );

    expect(await aclManager.isFlashBorrower(flashBorrower.address)).to.be.eq(true);
    expect(await aclManager.hasRole(FLASH_BORROW_ADMIN_ROLE, flashBorrowAdmin.address)).to.be.eq(
      true
    );
  });

  it('Grant POOL_ADMIN role', async () => {
    const {
      deployer,
      users: [, poolAdmin],
    } = testEnv;

    expect(await aclManager.isPoolAdmin(poolAdmin.address)).to.be.eq(false);
    await aclManager.connect(deployer.signer).addPoolAdmin(poolAdmin.address);
    expect(await aclManager.isPoolAdmin(poolAdmin.address)).to.be.eq(true);
  });

  it('Grant EMERGENCY_ADMIN role', async () => {
    const {
      deployer,
      users: [, , emergencyAdmin],
    } = testEnv;

    expect(await aclManager.isEmergencyAdmin(emergencyAdmin.address)).to.be.eq(false);
    await aclManager.connect(deployer.signer).addEmergencyAdmin(emergencyAdmin.address);
    expect(await aclManager.isEmergencyAdmin(emergencyAdmin.address)).to.be.eq(true);
  });

  it('Grant BRIDGE role', async () => {
    const {
      deployer,
      users: [, , , bridge],
    } = testEnv;

    expect(await aclManager.isBridge(bridge.address)).to.be.eq(false);
    await aclManager.connect(deployer.signer).addBridge(bridge.address);
    expect(await aclManager.isBridge(bridge.address)).to.be.eq(true);
  });

  it('Grant RISK_ADMIN role', async () => {
    const {
      deployer,
      users: [, , , , riskAdmin],
    } = testEnv;

    expect(await aclManager.isRiskAdmin(riskAdmin.address)).to.be.eq(false);
    await aclManager.connect(deployer.signer).addRiskAdmin(riskAdmin.address);
    expect(await aclManager.isRiskAdmin(riskAdmin.address)).to.be.eq(true);
  });

  it('Grant ASSET_LISTING_ADMIN role', async () => {
    const {
      deployer,
      users: [, , , , , assetListingAdmin],
    } = testEnv;

    expect(await aclManager.isAssetListingAdmin(assetListingAdmin.address)).to.be.eq(false);
    await aclManager.connect(deployer.signer).addAssetListingAdmin(assetListingAdmin.address);
    expect(await aclManager.isAssetListingAdmin(assetListingAdmin.address)).to.be.eq(true);
  });

  it('Revoke FLASH_BORROWER', async () => {
    const {
      users: [flashBorrowAdmin, flashBorrower],
    } = testEnv;

    expect(await aclManager.isFlashBorrower(flashBorrower.address)).to.be.eq(true);
    expect(await aclManager.hasRole(FLASH_BORROW_ADMIN_ROLE, flashBorrowAdmin.address)).to.be.eq(
      true
    );

    await aclManager.connect(flashBorrowAdmin.signer).removeFlashBorrower(flashBorrower.address);

    expect(await aclManager.isFlashBorrower(flashBorrower.address)).to.be.eq(false);
    expect(await aclManager.hasRole(FLASH_BORROW_ADMIN_ROLE, flashBorrowAdmin.address)).to.be.eq(
      true
    );
  });

  it('Revoke FLASH_BORROWER_ADMIN', async () => {
    const {
      deployer,
      users: [flashBorrowAdmin],
    } = testEnv;

    expect(await aclManager.hasRole(FLASH_BORROW_ADMIN_ROLE, flashBorrowAdmin.address)).to.be.eq(
      true
    );
    await aclManager
      .connect(deployer.signer)
      .revokeRole(FLASH_BORROW_ADMIN_ROLE, flashBorrowAdmin.address);
    expect(await aclManager.hasRole(FLASH_BORROW_ADMIN_ROLE, flashBorrowAdmin.address)).to.be.eq(
      false
    );
  });

  it('Revoke POOL_ADMIN', async () => {
    const {
      deployer,
      users: [, poolAdmin],
    } = testEnv;

    expect(await aclManager.isPoolAdmin(poolAdmin.address)).to.be.eq(true);
    await aclManager.connect(deployer.signer).removePoolAdmin(poolAdmin.address);
    expect(await aclManager.isPoolAdmin(poolAdmin.address)).to.be.eq(false);
  });

  it('Revoke EMERGENCY_ADMIN', async () => {
    const {
      deployer,
      users: [, , emergencyAdmin],
    } = testEnv;

    expect(await aclManager.isEmergencyAdmin(emergencyAdmin.address)).to.be.eq(true);
    await aclManager.connect(deployer.signer).removeEmergencyAdmin(emergencyAdmin.address);
    expect(await aclManager.isEmergencyAdmin(emergencyAdmin.address)).to.be.eq(false);
  });

  it('Revoke BRIDGE', async () => {
    const {
      deployer,
      users: [, , , bridge],
    } = testEnv;

    expect(await aclManager.isBridge(bridge.address)).to.be.eq(true);
    await aclManager.connect(deployer.signer).removeBridge(bridge.address);
    expect(await aclManager.isBridge(bridge.address)).to.be.eq(false);
  });

  it('Revoke RISK_ADMIN', async () => {
    const {
      deployer,
      users: [, , , , riskAdmin],
    } = testEnv;

    expect(await aclManager.isRiskAdmin(riskAdmin.address)).to.be.eq(true);
    await aclManager.connect(deployer.signer).removeRiskAdmin(riskAdmin.address);
    expect(await aclManager.isRiskAdmin(riskAdmin.address)).to.be.eq(false);
  });

  it('Revoke ASSET_LISTING_ADMIN', async () => {
    const {
      deployer,
      users: [, , , , , assetListingAdmin],
    } = testEnv;

    expect(await aclManager.isAssetListingAdmin(assetListingAdmin.address)).to.be.eq(true);
    await aclManager.connect(deployer.signer).removeAssetListingAdmin(assetListingAdmin.address);
    expect(await aclManager.isAssetListingAdmin(assetListingAdmin.address)).to.be.eq(false);
  });

  it('Tries to deploy ACLManager when ACLAdmin is ZERO_ADDRESS (revert expected)', async () => {
    const { deployer, addressesProvider } = testEnv;

    expect(await addressesProvider.setACLAdmin(ZERO_ADDRESS));
    const deployTx = new ACLManager__factory(deployer.signer).deploy(addressesProvider.address);
    await expect(deployTx).to.be.revertedWith(ProtocolErrors.ACL_ADMIN_CANNOT_BE_ZERO);
  });
});
