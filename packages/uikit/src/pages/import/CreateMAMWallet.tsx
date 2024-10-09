import { FC, useContext, useEffect, useMemo, useState } from 'react';
import { IconPage } from '../../components/Layout';
import { UpdateWalletName } from '../../components/create/WalletName';
import { Check, Words } from '../../components/create/Words';
import { Button } from '../../components/fields/Button';
import {
    CheckLottieIcon,
    GearLottieIcon,
    WriteLottieIcon
} from '../../components/lottie/LottieIcons';
import { useAppSdk } from '../../hooks/appSdk';
import { useTranslation } from '../../hooks/translation';
import { FinalView } from './Password';
import { Subscribe } from './Subscribe';
import { Account, AccountMAM } from '@tonkeeper/core/dist/entries/account';
import {
    useCreateAccountMAM,
    useMutateRenameAccount,
    useMutateRenameAccountDerivations
} from '../../state/wallet';
import { TonKeychainRoot } from '@ton-keychain/core';
import { useConfirmDiscardNotification } from '../../components/modals/ConfirmDiscardNotificationControlled';
import { AddWalletContext } from '../../components/create/AddWalletContext';
import {
    OnCloseInterceptor,
    useSetNotificationOnBack,
    useSetNotificationOnCloseInterceptor
} from '../../components/Notification';

export const CreateMAMWallet: FC<{ afterCompleted: () => void }> = ({ afterCompleted }) => {
    const sdk = useAppSdk();
    const { t } = useTranslation();
    const { mutateAsync: createWalletsAsync, isLoading: isCreateWalletLoading } =
        useCreateAccountMAM();
    const { mutateAsync: renameAccount, isLoading: renameAccountLoading } =
        useMutateRenameAccount();
    const { mutateAsync: renameDerivations, isLoading: renameDerivationsLoading } =
        useMutateRenameAccountDerivations();

    const [mnemonic, setMnemonic] = useState<string[] | undefined>();
    const [createdAccount, setCreatedAccount] = useState<Account | undefined>(undefined);

    const [creatingAnimationPassed, setCreatingAnimationPassed] = useState(false);
    const [infoPagePassed, setInfoPagePassed] = useState(false);
    const [wordsPagePassed, setWordsPagePassed] = useState(false);
    const [editNamePagePassed, setEditNamePagePassed] = useState(false);
    const [notificationsSubscribePagePassed, setPassNotification] = useState(false);

    const [wordsShown, setWordsShown] = useState(false);

    useEffect(() => {
        if (infoPagePassed) {
            setWordsShown(true);
        }
    }, [infoPagePassed]);

    const onRename = async (form: { name: string; emoji: string }) => {
        const derivationIndexes = (createdAccount as AccountMAM).allAvailableDerivations.map(
            d => d.index
        );
        await renameAccount({
            id: createdAccount!.id,
            ...form
        });
        const newAcc = await renameDerivations({
            id: createdAccount!.id,
            derivationIndexes,
            emoji: form.emoji
        });

        setEditNamePagePassed(true);
        setCreatedAccount(newAcc);
    };

    useEffect(() => {
        setTimeout(() => {
            TonKeychainRoot.generate().then(value => setMnemonic(value.mnemonic));
        }, 1500);
    }, []);

    useEffect(() => {
        if (mnemonic) {
            setTimeout(() => {
                setCreatingAnimationPassed(true);
            }, 1500);
        }
    }, [mnemonic]);

    const { onOpen: openConfirmDiscard } = useConfirmDiscardNotification();
    const { navigateHome } = useContext(AddWalletContext);
    const onBack = useMemo(() => {
        if (!infoPagePassed) {
            if (!wordsShown) {
                return navigateHome;
            }
            return () =>
                openConfirmDiscard({
                    onClose: discard => {
                        if (discard) {
                            navigateHome?.();
                        }
                    }
                });
        }

        if (!wordsPagePassed) {
            return () => setInfoPagePassed(false);
        }

        if (!createdAccount) {
            return () => setWordsPagePassed(false);
        }

        return undefined;
    }, [
        wordsShown,
        openConfirmDiscard,
        navigateHome,
        infoPagePassed,
        wordsPagePassed,
        createdAccount
    ]);
    useSetNotificationOnBack(onBack);

    const onCloseInterceptor = useMemo<OnCloseInterceptor>(() => {
        if (!wordsShown) {
            return undefined;
        }

        if (createdAccount) {
            return undefined;
        }

        return closeModal => {
            openConfirmDiscard({
                onClose: discard => {
                    if (discard) {
                        closeModal();
                    }
                }
            });
        };
    }, [wordsShown, openConfirmDiscard, createdAccount]);
    useSetNotificationOnCloseInterceptor(onCloseInterceptor);

    if (!mnemonic) {
        return <IconPage icon={<GearLottieIcon />} title={t('create_wallet_generating')} />;
    }

    if (!creatingAnimationPassed) {
        return <IconPage icon={<CheckLottieIcon />} title={t('create_wallet_generated')} />;
    }

    if (!infoPagePassed) {
        return (
            <IconPage
                logOut
                icon={<WriteLottieIcon />}
                title={t('create_wallet_title')}
                description={t('create_wallet_caption')}
                button={
                    <Button
                        size="large"
                        fullWidth
                        primary
                        marginTop
                        onClick={() => setInfoPagePassed(true)}
                    >
                        {t('continue')}
                    </Button>
                }
            />
        );
    }

    if (!wordsPagePassed) {
        return <Words mnemonic={mnemonic} onCheck={() => setWordsPagePassed(true)} />;
    }

    if (!createdAccount) {
        return (
            <Check
                mnemonic={mnemonic}
                onConfirm={() => {
                    createWalletsAsync({
                        mnemonic,
                        selectedDerivations: [0],
                        selectAccount: true
                    }).then(setCreatedAccount);
                }}
                isLoading={isCreateWalletLoading}
            />
        );
    }

    if (!editNamePagePassed) {
        return (
            <UpdateWalletName
                name={createdAccount.name}
                submitHandler={onRename}
                walletEmoji={createdAccount.emoji}
                isLoading={renameAccountLoading || renameDerivationsLoading}
            />
        );
    }

    if (sdk.notifications && !notificationsSubscribePagePassed) {
        return (
            <Subscribe
                wallet={createdAccount.activeTonWallet}
                mnemonic={mnemonic}
                onDone={() => setPassNotification(true)}
            />
        );
    }

    return <FinalView afterCompleted={afterCompleted} />;
};