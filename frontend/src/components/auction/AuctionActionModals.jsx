import React, { useState } from 'react';
import styles from './AuctionActionModals.module.css';

const formatMoney = (value) =>
  `${new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value || 0))} BYN`;

const getLotPaymentDue = (auction) => {
  const total = Number(auction?.winningBidAmount || auction?.currentPrice || auction?.lastBidPrice || auction?.pricing?.priceWithVat || 0);
  const deposit = Number(auction?.pricing?.depositAmount || 0);
  return Math.max(total - deposit, 0);
};

function PaymentForm({ title, amount, description, loading, onCancel, onSubmit }) {
  const [form, setForm] = useState({ cardNumber: '', cardHolder: '', expiry: '', cvc: '' });
  const [error, setError] = useState('');

  const update = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const submit = (event) => {
    event.preventDefault();
    const cleanCard = form.cardNumber.replace(/\D/g, '');

    if (cleanCard.length < 12 || form.cardHolder.trim().length < 2 || form.expiry.trim().length < 4 || form.cvc.trim().length < 3) {
      setError('Заполните реквизиты карты');
      return;
    }

    setError('');
    onSubmit(form);
  };

  return (
    <div className={styles.modalBackdrop}>
      <form className={styles.modal} onSubmit={submit}>
        <h2>{title}</h2>
        {description && <p>{description}</p>}
        <div className={styles.paymentAmount}>
          <span>Сумма к оплате</span>
          <strong>{formatMoney(amount)}</strong>
        </div>
        <label className={styles.field}>
          <span>Номер карты</span>
          <input value={form.cardNumber} onChange={(event) => update('cardNumber', event.target.value)} placeholder="0000 0000 0000 0000" />
        </label>
        <label className={styles.field}>
          <span>Имя владельца</span>
          <input value={form.cardHolder} onChange={(event) => update('cardHolder', event.target.value)} placeholder="IVAN IVANOV" />
        </label>
        <div className={styles.paymentRow}>
          <label className={styles.field}>
            <span>Срок действия</span>
            <input value={form.expiry} onChange={(event) => update('expiry', event.target.value)} placeholder="12/28" />
          </label>
          <label className={styles.field}>
            <span>CVC</span>
            <input value={form.cvc} onChange={(event) => update('cvc', event.target.value)} placeholder="123" />
          </label>
        </div>
        {error && <p className={styles.error}>{error}</p>}
        <div className={styles.actions}>
          <button className={styles.buttonSecondary} type="button" onClick={onCancel} disabled={loading}>Отмена</button>
          <button className={styles.button} type="submit" disabled={loading}>{loading ? 'Оплата...' : 'Оплатить'}</button>
        </div>
      </form>
    </div>
  );
}

function ConfirmApply({ auction, loading, onCancel, onConfirm }) {
  return (
    <div className={styles.modalBackdrop}>
      <div className={styles.modal}>
        <h2>Подать заявку на участие</h2>
        <p>После подачи заявки нужно оплатить задаток до окончания приема заявок.</p>
        <div className={styles.paymentAmount}>
          <span>Задаток</span>
          <strong>{formatMoney(auction?.pricing?.depositAmount)}</strong>
        </div>
        <div className={styles.actions}>
          <button className={styles.buttonSecondary} type="button" onClick={onCancel} disabled={loading}>Отмена</button>
          <button className={styles.button} type="button" onClick={onConfirm} disabled={loading}>
            {loading ? 'Подача...' : 'Подать заявку'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ConfirmCancel({ auction, loading, onCancel, onConfirm }) {
  return (
    <div className={styles.modalBackdrop}>
      <div className={styles.modal}>
        <h2>Отменить аукцион</h2>
        <p>
          После подтверждения аукцион будет переведен в статус "Отменен". Участники больше не смогут подавать заявки и делать ставки.
        </p>
        {auction?.item?.title && (
          <div className={styles.paymentAmount}>
            <span>Аукцион</span>
            <strong>{auction.item.title}</strong>
          </div>
        )}
        <div className={styles.actions}>
          <button className={styles.buttonSecondary} type="button" onClick={onCancel} disabled={loading}>Назад</button>
          <button className={styles.buttonDanger} type="button" onClick={onConfirm} disabled={loading}>
            {loading ? 'Отмена...' : 'Отменить аукцион'}
          </button>
        </div>
      </div>
    </div>
  );
}

function AuctionActionModals({ action, loading, error, onCancel, onConfirmApply, onConfirmCancel, onPayDeposit, onPayLot }) {
  if (!action) {
    return null;
  }

  const { type, auction } = action;

  return (
    <>
      {type === 'apply' && (
        <ConfirmApply auction={auction} loading={loading} onCancel={onCancel} onConfirm={onConfirmApply} />
      )}
      {type === 'cancel' && (
        <ConfirmCancel auction={auction} loading={loading} onCancel={onCancel} onConfirm={onConfirmCancel} />
      )}
      {type === 'deposit' && (
        <PaymentForm
          title="Оплата задатка"
          amount={auction?.pricing?.depositAmount}
          description="После оплаты заявка будет одобрена, а вам будет выдан конфиденциальный номер участника."
          loading={loading}
          onCancel={onCancel}
          onSubmit={onPayDeposit}
        />
      )}
      {type === 'lot' && (
        <PaymentForm
          title="Оплата выигранного лота"
          amount={getLotPaymentDue(auction)}
          description="К оплате выставлена стоимость выигранного лота за вычетом ранее внесенного задатка."
          loading={loading}
          onCancel={onCancel}
          onSubmit={onPayLot}
        />
      )}
      {error && <div className={styles.floatingError}>{error}</div>}
    </>
  );
}

export default AuctionActionModals;
