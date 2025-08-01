import {
  createBundlerClient,
  createSmartAccountClientFromExisting,
  erc7677Middleware,
  LocalAccountSigner,
  type BatchUserOperationCallData,
  type SmartAccountSigner,
  type UserOperationCallData,
  type UserOperationOverrides,
  type UserOperationStruct,
} from "@aa-sdk/core";
import { custom, fromHex, parseEther, publicActions, type Address } from "viem";
import { setBalance } from "viem/actions";
import { resetBalance } from "~test/accounts.js";
import { accounts } from "~test/constants.js";
// TODO: update the tests that just use the 060 instance to use versions + 070 instance
import {
  alchemyFeeEstimator,
  alchemyGasAndPaymasterAndDataMiddleware,
} from "@account-kit/infra";
import { toHex } from "viem";
import { generatePrivateKey } from "viem/accounts";
import { local060Instance, local070Instance } from "~test/instances.js";
import { multiOwnerPluginActions } from "../../msca/plugins/multi-owner/index.js";
import { getMSCAUpgradeToData } from "../../msca/utils.js";
import type { LightAccountVersion } from "../types.js";
import { AccountVersionRegistry } from "../utils.js";
import { createLightAccountClient } from "./client.js";

const versions = Object.keys(
  AccountVersionRegistry.LightAccount,
) as LightAccountVersion<"LightAccount">[];

describe("Light Account Tests", () => {
  let instance = local060Instance;
  let client: ReturnType<typeof instance.getClient>;

  beforeAll(async () => {
    client = instance.getClient();
  });

  const signer: SmartAccountSigner =
    LocalAccountSigner.generatePrivateKeySigner();

  it.each(versions)(
    "should return correct dummy signature",
    async (version) => {
      const { account } = await givenConnectedProvider({
        signer,
        version,
      });
      switch (version) {
        case "v1.0.1":
        case "v1.0.2":
        case "v1.1.0":
          expect(account.getDummySignature()).toBe(
            "0xfffffffffffffffffffffffffffffff0000000000000000000000000000000007aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1c",
          );
          break;
        case "v2.0.0":
          expect(account.getDummySignature()).toBe(
            "0x00fffffffffffffffffffffffffffffff0000000000000000000000000000000007aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1c",
          );
          break;
        default:
          throw new Error(`Unknown version ${version}`);
      }
    },
  );

  it.each(versions)("should correctly sign the message", async (version) => {
    const provider = await givenConnectedProvider({
      signer,
      version,
    });

    const { account } = provider;

    const message = "hello world";
    switch (version) {
      case "v1.0.2":
        await expect(account.signMessage({ message })).rejects.toThrowError(
          "Version v1.0.2 of LightAccount doesn't support 1271",
        );
        break;
      case "v1.0.1":
      case "v1.1.0":
      case "v2.0.0":
        {
          const signature = await account.signMessageWith6492({
            message,
          });

          // We must use a public client, rather than an account client, to verify the message, because AA-SDK incorrectly attaches the account address as a "from" field to all actions taken by that client, including the `eth_call` used internally by viem's signature verifier logic. Per EIP-684, contract creation reverts on non-zero nonce, and the `eth_call`'s from field implicitly increases the nonce of the account contract, causing the contract creation to revert.
          expect(
            await client.extend(publicActions).verifyMessage({
              address: account.address,
              message,
              signature,
            }),
          ).toBe(true);
        }
        break;
      default:
        throw new Error(`Unknown version ${version}`);
    }
  });

  it.each(versions)("should correctly sign typed data", async (version) => {
    const { account } = await givenConnectedProvider({
      signer,
      version,
    });
    const typedData = {
      types: {
        Request: [{ name: "hello", type: "string" }],
      },
      primaryType: "Request",
      message: {
        hello: "world",
      },
    } as const;
    switch (version) {
      case "v1.0.2":
        await expect(account.signTypedData(typedData)).rejects.toThrowError(
          "Version v1.0.2 of LightAccount doesn't support 1271",
        );
        break;
      case "v1.1.0":
      case "v1.0.1":
      case "v2.0.0":
        {
          const signature = await account.signTypedDataWith6492(typedData);

          // See above comment for context on the duplicate client.
          expect(
            await client.extend(publicActions).verifyTypedData({
              address: account.address,
              signature,
              ...typedData,
            }),
          ).toBe(true);
        }
        break;
      default:
        throw new Error(`Unknown version ${version}`);
    }
  });

  it.each(versions)(
    "should correctly encode transferOwnership data",
    async (version) => {
      const { account } = await givenConnectedProvider({
        signer,
        version,
      });
      expect(
        account.encodeTransferOwnership(
          "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef",
        ),
      ).toBe(
        "0xf2fde38b000000000000000000000000deadbeefdeadbeefdeadbeefdeadbeefdeadbeef",
      );
    },
  );

  it.each(versions)(
    "should correctly encode batch transaction data",
    async (version) => {
      const provider = await givenConnectedProvider({ signer, version });
      const data = [
        {
          target: "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef",
          data: "0xdeadbeef",
        },
        {
          target: "0x8ba1f109551bd432803012645ac136ddd64dba72",
          data: "0xcafebabe",
        },
      ] satisfies BatchUserOperationCallData;

      expect(await provider.account.encodeBatchExecute(data)).toBe(
        "0x47e1da2a000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000c000000000000000000000000000000000000000000000000000000000000001200000000000000000000000000000000000000000000000000000000000000002000000000000000000000000deadbeefdeadbeefdeadbeefdeadbeefdeadbeef0000000000000000000000008ba1f109551bd432803012645ac136ddd64dba720000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000004deadbeef000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000004cafebabe00000000000000000000000000000000000000000000000000000000",
      );
    },
  );

  it("should successfully get counterfactual address", async () => {
    const provider = await givenConnectedProvider({
      signer: new LocalAccountSigner(accounts.fundedAccountOwner),
    });
    expect(provider.getAddress()).toMatchInlineSnapshot(
      '"0x9EfDfCB56390eDd8b2eAE6daBC148CED3491AAf6"',
    );
  });

  it("should execute successfully", async () => {
    const provider = await givenConnectedProvider({
      signer: LocalAccountSigner.generatePrivateKeySigner(),
    });

    await setBalance(instance.getClient(), {
      address: provider.getAddress(),
      value: parseEther("10"),
    });

    const result = await provider.sendUserOperation({
      uo: {
        target: provider.account.getEntryPoint().address,
        data: "0x",
        value: parseEther("1"),
      },
    });

    const txnHash = provider
      .waitForUserOperationTransaction(result)
      .catch(async () => {
        const dropAndReplaceResult = await provider.dropAndReplaceUserOperation(
          {
            uoToDrop: result.request,
          },
        );
        return await provider.waitForUserOperationTransaction(
          dropAndReplaceResult,
        );
      });

    await expect(txnHash).resolves.not.toThrowError();
  }, 30_000);

  it("should fail to execute if account address is not deployed and not correct", async () => {
    const accountAddress = "0xc33AbD9621834CA7c6Fc9f9CC3c47b9c17B03f9F";
    const provider = await givenConnectedProvider({
      signer,
      accountAddress,
    });

    const result = provider.sendUserOperation({
      uo: {
        target: provider.getAddress(),
        data: "0x",
      },
    });

    await expect(result).rejects.toThrowError();
  });

  it("should successfully execute with paymaster info using erc-7677 middleware", async () => {
    const provider = await givenConnectedProvider({
      signer,
      paymasterMiddleware: "erc7677",
    });

    const result = await provider.sendUserOperation({
      uo: {
        target: provider.getAddress(),
        data: "0x",
      },
    });

    // @ts-expect-error this is union type when used generically, but we know it's 0.6.0 for now
    // TODO: when using multiple versions, we need to check the version and cast accordingly
    expect(result.request.paymasterAndData).not.toBe("0x");

    const txnHash = provider
      .waitForUserOperationTransaction(result)
      .catch(async () => {
        const dropAndReplaceResult = await provider.dropAndReplaceUserOperation(
          {
            uoToDrop: result.request,
          },
        );
        return await provider.waitForUserOperationTransaction(
          dropAndReplaceResult,
        );
      });

    await expect(txnHash).resolves.not.toThrowError();
  });

  it("should successfully execute with paymaster info using alchemy paymaster middleware", async () => {
    const provider = await givenConnectedProvider({
      signer,
      paymasterMiddleware: "alchemyGasAndPaymasterAndData",
    });

    const result = await provider.sendUserOperation({
      uo: {
        target: provider.getAddress(),
        data: "0x",
      },
    });

    // @ts-expect-error this is union type when used generically, but we know it's 0.6.0 for now
    // TODO: when using multiple versions, we need to check the version and cast accordingly
    expect(result.request.paymasterAndData).not.toBe("0x");

    const txnHash = provider
      .waitForUserOperationTransaction(result)
      .catch(async () => {
        const dropAndReplaceResult = await provider.dropAndReplaceUserOperation(
          {
            uoToDrop: result.request,
          },
        );
        return await provider.waitForUserOperationTransaction(
          dropAndReplaceResult,
        );
      });

    await expect(txnHash).resolves.not.toThrowError();
  });

  it("should bypass paymaster when paymasterAndData of user operation overrides is set to 0x using erc-7677 middleware", async () => {
    const provider = await givenConnectedProvider({
      signer,
      paymasterMiddleware: "erc7677",
    });

    // set the value to 0 so that we can capture an error in sending the uo
    await resetBalance(provider, instance.getClient());

    const toSend = {
      uo: {
        target: provider.getAddress(),
        data: "0x",
      } as UserOperationCallData,
      overrides: {
        paymasterAndData: "0x", // bypass paymaster
      } as UserOperationOverrides<"0.6.0">,
    };
    const uoStruct = (await provider.buildUserOperation(
      toSend,
    )) as UserOperationStruct<"0.6.0">;

    expect(uoStruct.paymasterAndData).toBe("0x");

    await expect(provider.sendUserOperation(toSend)).rejects.toThrowError();
  });

  it.each(versions)(
    "should override nonce key when nonce key of user operation overrides is set for version %s",
    async (version) => {
      instance = version !== "v2.0.0" ? local060Instance : local070Instance; // v2 uses EP0.7
      const provider = await givenConnectedProvider({
        signer,
        paymasterMiddleware: "erc7677",
        version,
      });

      // set the value to 0 so that we can capture an error in sending the uo
      await resetBalance(provider, instance.getClient());

      const toSend = {
        uo: {
          target: provider.getAddress(),
          data: "0x",
        } as UserOperationCallData,
        overrides: {
          nonceKey: fromHex("0x12", "bigint"),
        },
      };
      const uoStruct = await provider.buildUserOperation(toSend);

      expect(toHex(uoStruct.nonce).startsWith("0x12")).toBe(true);
      const result = await provider.sendUserOperation(toSend);

      await expect(
        provider.waitForUserOperationTransaction(result),
      ).resolves.not.toThrowError();

      // reset the instance
      instance = local060Instance;
    },
  );

  it("should bypass paymaster when paymasterAndData of user operation overrides is set to 0x using alchemy paymaster middleware", async () => {
    const provider = await givenConnectedProvider({
      signer,
      paymasterMiddleware: "alchemyGasAndPaymasterAndData",
    });

    // set the value to 0 so that we can capture an error in sending the uo
    await resetBalance(provider, instance.getClient());

    const toSend = {
      uo: {
        target: provider.getAddress(),
        data: "0x",
      } as UserOperationCallData,
      overrides: {
        paymasterAndData: "0x", // bypass paymaster
      } as UserOperationOverrides<"0.6.0">,
    };
    const uoStruct = (await provider.buildUserOperation(
      toSend,
    )) as UserOperationStruct<"0.6.0">;

    expect(uoStruct.paymasterAndData).toBe("0x");

    await expect(provider.sendUserOperation(toSend)).rejects.toThrowError();
  });

  it("should transfer ownership successfully", async () => {
    // create a throwaway address
    const throwawaySigner =
      LocalAccountSigner.privateKeyToAccountSigner(generatePrivateKey());
    const throwawayClient = await givenConnectedProvider({
      signer: throwawaySigner,
    });

    // fund the throwaway address
    await setBalance(client, {
      address: throwawayClient.getAddress(),
      value: 200000000000000000n,
    });

    // create new signer and transfer ownership
    const newOwner =
      LocalAccountSigner.privateKeyToAccountSigner(generatePrivateKey());

    await throwawayClient.transferOwnership({
      newOwner,
      waitForTxn: true,
    });

    const newOwnerClient = await givenConnectedProvider({
      signer: newOwner,
      accountAddress: throwawayClient.getAddress(),
    });

    const newOwnerAddress = await newOwnerClient.account.getOwnerAddress();

    expect(newOwnerAddress).not.toBe(await throwawaySigner.getAddress());
    expect(newOwnerAddress).toBe(await newOwner.getAddress());
  }, 100000);

  it("should upgrade a deployed light account to msca successfully", async () => {
    // create a owner signer to create the account
    const throwawaySigner =
      LocalAccountSigner.privateKeyToAccountSigner(generatePrivateKey());
    const throwawayClient = await givenConnectedProvider({
      signer: throwawaySigner,
    });

    const accountAddress = throwawayClient.getAddress();
    const ownerAddress = await throwawaySigner.getAddress();

    // fund + deploy the throwaway address
    await setBalance(client, {
      address: accountAddress,
      value: 200000000000000000n,
    });

    const { createMAAccount, ...upgradeToData } = await getMSCAUpgradeToData(
      throwawayClient,
      {
        account: throwawayClient.account,
        multiOwnerPluginAddress: "0xcE0000007B008F50d762D155002600004cD6c647",
      },
    );

    await throwawayClient.upgradeAccount({
      upgradeTo: upgradeToData,
      waitForTx: true,
    });

    const upgradedClient = createSmartAccountClientFromExisting({
      client: createBundlerClient({
        chain: instance.chain,
        transport: custom(client),
      }),
      account: await createMAAccount(),
    }).extend(multiOwnerPluginActions);

    const upgradedAccountAddress = upgradedClient.getAddress();

    const owners = await upgradedClient.readOwners({
      account: upgradedClient.account,
      pluginAddress: "0xcE0000007B008F50d762D155002600004cD6c647",
    });

    expect(upgradedAccountAddress).toBe(accountAddress);
    expect(owners).toContain(ownerAddress);
  }, 200000);

  it.each(versions)(
    "should expose prepare and format functions that work",
    async (version) => {
      if (version !== "v1.0.2") {
        const provider = await givenConnectedProvider({ signer, version });
        const message = "hello world";

        const { type, data } = await provider.account.prepareSign({
          type: "personal_sign",
          data: message,
        });

        const signature = await provider.account.formatSign(
          await (type === "personal_sign"
            ? provider.account.getSigner().signMessage(data)
            : provider.account.getSigner().signTypedData(data)),
        );

        const fullSignature = await provider.signMessage({ message });

        // We use `includes` to check against 6492, and slice to remove the 0x prefix
        expect(fullSignature.includes(signature.slice(2))).toBe(true);
      }
    },
  );

  const givenConnectedProvider = ({
    signer,
    version = "v1.1.0",
    accountAddress,
    paymasterMiddleware,
  }: {
    signer: SmartAccountSigner;
    version?: LightAccountVersion<"LightAccount">;
    paymasterMiddleware?: "alchemyGasAndPaymasterAndData" | "erc7677";
    accountAddress?: Address;
  }) =>
    createLightAccountClient({
      signer,
      accountAddress,
      version,
      transport: custom(instance.getClient()),
      chain: instance.chain,
      feeEstimator: alchemyFeeEstimator(
        // @ts-ignore (expects an alchemy transport, but we're using a custom transport for mocking)
        custom(instance.getClient()),
      ),
      ...(paymasterMiddleware === "alchemyGasAndPaymasterAndData"
        ? alchemyGasAndPaymasterAndDataMiddleware({
            policyId: "FAKE_POLICY_ID",
            // @ts-ignore (expects an alchemy transport, but we're using a custom transport for mocking)
            transport: custom(instance.getClient()),
          })
        : paymasterMiddleware === "erc7677"
          ? erc7677Middleware()
          : {}),
    });
});
