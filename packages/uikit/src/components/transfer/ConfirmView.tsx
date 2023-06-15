import { useMutation } from '@tanstack/react-query';
import { AmountData, RecipientData } from '@tonkeeper/core/dist/entries/send';
import { JettonsBalances } from '@tonkeeper/core/dist/tonApiV1';
import { DefaultDecimals } from '@tonkeeper/core/dist/utils/send';

import { CryptoCurrency } from '@tonkeeper/core/dist/entries/crypto';
import React, {
  Children, ComponentProps,
  createContext,
  FC,
  isValidElement,
  PropsWithChildren, ReactNode,
  useContext,
  useMemo,
  useState
} from 'react';
import { useAppContext } from '../../hooks/appContext';
import { formatter } from '../../hooks/balance';
import { useSendTransfer } from '../../hooks/blockchain/useSendTransfer';
import { useTranslation } from '../../hooks/translation';
import { useTonenpointStock } from '../../state/tonendpoint';
import {
  CheckmarkCircleIcon,
  ChevronLeftIcon,
  ExclamationMarkCircleIcon,
} from '../Icon';
import { Gap } from '../Layout';
import { ListBlock } from '../List';
import {
  FullHeightBlock,
  NotificationCancelButton,
  NotificationTitleBlock,
} from '../Notification';
import { Label2 } from '../Text';
import { TransferComment } from '../activity/ActivityActionDetails';
import { ActionFeeDetails } from '../activity/NotificationCommon';
import { BackButton } from '../fields/BackButton';
import { Button } from '../fields/Button';
import { Image, ImageMock, Info, SendingTitle, Title } from './Confirm';
import { AmountListItem, RecipientListItem } from './ConfirmListItem';
import { ButtonBlock, ResultButton, useFiatAmount } from './common';
import styled from "styled-components";

type MutationProps = Pick<
  ReturnType<typeof useMutation<boolean, Error>>,
  'mutateAsync' | 'isLoading' | 'error' | 'reset'
>;

type ConfirmViewContextValue = {
  recipient: RecipientData;
  amount: AmountData;
  jettons: JettonsBalances;
  currencyInfo: {
    image: string | undefined;
    title: string;
    symbol: string;
    decimals: number;
  }
  formState: {
    done: boolean;
    isLoading: boolean;
    error: Error | null;
  }
  onCancel: () => void;
};
const ConfirmViewContext = createContext<ConfirmViewContextValue>({} as ConfirmViewContextValue);
export function useConfirmViewContext() {
  return useContext(ConfirmViewContext);
}

export const ConfirmView: FC<
    PropsWithChildren<{
      recipient: RecipientData;
      amount: AmountData;
      jettons: JettonsBalances;
      onBack?: () => void;
      onClose: (confirmed?: boolean) => void;
    } & (MutationProps | {})>
> = ({
       children,
       recipient,
       onBack,
       onClose,
       amount,
       jettons,
       ...mutationProps
     }) => {

  let mutation: MutationProps = useSendTransfer(
      recipient,
      amount,
      jettons
  );

  if ('mutateAsync' in mutationProps) {
    mutation = mutationProps;
  }

  const { mutateAsync, isLoading, error, reset } = mutation;

  let heading: ReactNode =  <ConfirmViewHeadingSlot><ConfirmViewHeading /></ConfirmViewHeadingSlot>
  let details: ReactNode = <ConfirmViewDetailsSlot>
    <ConfirmViewDetailsRecipient />
    <ConfirmViewDetailsAmount />
    <ConfirmViewDetailsFee />
    <ConfirmViewDetailsComment />
  </ConfirmViewDetailsSlot>;
  let buttons: ReactNode =  <ConfirmViewButtonsSlot>
    <ConfirmViewButtons />
  </ConfirmViewButtonsSlot>;

  Children.map(children, child => {
    if (isValidElement(child)) {
      switch (child.type) {
        case ConfirmViewHeadingSlot:
          heading = child;
          return;
        case ConfirmViewDetailsSlot:
          details = child;
          return;
        case ConfirmViewButtonsSlot:
          buttons = child;
          return;
      }
    }
  })
  const [done, setDone] = useState(false);
  const { t } = useTranslation();

  const { standalone } = useAppContext();

  const onSubmit: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.stopPropagation();
    e.preventDefault();

    if (isLoading) return;
    try {
      reset();
      const done = await mutateAsync();
      if (done) {
        setDone(true);
        setTimeout(() => onClose(true), 2000);
      }
    } catch (e) {}
  };

  const [jettonImage, title, symbol, decimals] = useMemo(() => {
    if (amount.jetton === CryptoCurrency.TON) {
      return [
        '/img/toncoin.svg',
        t('txActions_signRaw_types_tonTransfer'),
        CryptoCurrency.TON.toString(),
        DefaultDecimals,
      ] as const;
    }

    const jetton = jettons.balances.find(
        (item) => item.jettonAddress === amount.jetton
    );

    return [
      jetton?.metadata?.image,
      t('txActions_signRaw_types_jettonTransfer'),
      jetton?.metadata?.symbol ?? amount.jetton,
      jetton?.metadata?.decimals ?? DefaultDecimals,
    ] as const;
  }, [amount.jetton, jettons, t]);

  return (
      <ConfirmViewContext.Provider value={
        { recipient, jettons, amount, currencyInfo: { image: jettonImage, decimals, symbol, title }, formState: {  done, isLoading, error}, onCancel: () => onClose() }
      }>
        <FullHeightBlock onSubmit={onSubmit} standalone={standalone}>
          <NotificationTitleBlock>
            {onBack ? (
                <BackButton onClick={onBack}>
                  <ChevronLeftIcon />
                </BackButton>
            ): <div />}
            <NotificationCancelButton handleClose={() => onClose()} />
          </NotificationTitleBlock>
          { heading }
          <ListBlock margin={false} fullWidth>
            { details }
          </ListBlock>
          <Gap />

          <ButtonBlock>
            { buttons }
          </ButtonBlock>
        </FullHeightBlock>
      </ConfirmViewContext.Provider>
  );
};

const ConfirmViewHeadingStyled = styled.div`
  margin-bottom: 1rem;
`

export const ConfirmViewHeadingSlot: FC<PropsWithChildren<{ className?: string }>> = ({ children, className }) =>
    <ConfirmViewHeadingStyled className={className}>{children}</ConfirmViewHeadingStyled>;

export const ConfirmViewHeading: FC<PropsWithChildren<{ className?: string }>> = ({ className }) => {
  const { t } = useTranslation();
  const { recipient, currencyInfo: { image, title } } = useConfirmViewContext();
  return <Info className={className}>
    {recipient.toAccount.icon ? (
        <Image full src={recipient.toAccount.icon} />
    ) : image ? (
        <Image full src={image} />
    ) : (
        <ImageMock full />
    )}
    <SendingTitle>{t('confirm_sending_title')}</SendingTitle>
    <Title>
      {recipient.toAccount.name ? recipient.toAccount.name : title}
    </Title>
  </Info>
}


export const ConfirmViewDetailsSlot: FC<PropsWithChildren> = ({ children }) => <>{children}</>;


export const ConfirmViewDetailsRecipient: FC = () => {
  const { recipient } = useConfirmViewContext();
  return <RecipientListItem recipient={recipient} />
}

export const ConfirmViewDetailsAmount: FC = () => {
  const { jettons, amount, currencyInfo: { decimals, symbol } } = useConfirmViewContext();
  const fiatAmount = useFiatAmount(jettons, amount.jetton, amount.amount);

  const coinAmount = `${formatter.format(amount.amount, {
    ignoreZeroTruncate: false,
    decimals,
  })} ${symbol}`;

  return <AmountListItem coinAmount={coinAmount} fiatAmount={fiatAmount} />
}

export const ConfirmViewDetailsFee: FC = () => {
  const { data: stock } = useTonenpointStock();
  const { fiat } = useAppContext();
  const { amount } = useConfirmViewContext();
  return <ActionFeeDetails fee={amount.fee} stock={stock} fiat={fiat} />
}
export const ConfirmViewDetailsComment: FC = () => {
  const { recipient } = useConfirmViewContext();
  return <TransferComment comment={recipient.comment} />
}

export const ConfirmViewButtonsSlot: FC<PropsWithChildren> = ({ children }) => <>{children}</>;

const ConfirmViewButtonsContainerStyled = styled.div`
  display: flex;
  gap: 1rem;
  & > * {
    flex: 1;
  }
`

export const ConfirmViewButtons: FC<{ withCancelButton?: boolean }> = ({ withCancelButton }) => {
  const { formState: { done, error, isLoading }, onCancel } = useConfirmViewContext();
  const { t } = useTranslation();

  const isValid = !isLoading;

  if (done) {
      return <ResultButton done>
        <CheckmarkCircleIcon />
        <Label2>{t('send_screen_steps_done_done_label')}</Label2>
      </ResultButton>
  }

  if (error) {
    return  <ResultButton>
      <ExclamationMarkCircleIcon />
      <Label2>{t('send_publish_tx_error')}</Label2>
    </ResultButton>
  }

  if (withCancelButton) {
    return <ConfirmViewButtonsContainerStyled>
      <Button
          size="large"
          secondary
          onClick={onCancel}
      >
        Cancel{/*TODO i18n*/}
      </Button>
      <Button
          size="large"
          primary
          type="submit"
          disabled={!isValid}
          loading={isLoading}
      >
        Confirm{/*TODO i18n*/}
      </Button>
    </ConfirmViewButtonsContainerStyled>
  }

  return <Button
          fullWidth
          size="large"
          primary
          type="submit"
          disabled={!isValid}
          loading={isLoading}
      >
        {t('confirm_sending_submit')}
      </Button>
}
