const Auction = require('../models/Auction');
const AuctionApplication = require('../models/AuctionApplication');
const AuctionProtocol = require('../models/AuctionProtocol');
const Bid = require('../models/Bid');
const Deposit = require('../models/Deposit');
const { auctionCategoryLabels, buyerTerms, operatorInfo } = require('../constants/auctionConstants');
const { getCurrentTime } = require('./timeService');

const finishedProtocolStatuses = ['finished_success', 'finished_failed'];

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const formatDateTime = (value) => {
  const date = value ? new Date(value) : null;

  if (!date || Number.isNaN(date.getTime())) {
    return 'Не указано';
  }

  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: 'Europe/Minsk'
  }).format(date);
};

const formatMoney = (value) =>
  `${new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(Number(value || 0))} BYN`;

const formatPercent = (value) =>
  `${new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(Number(value || 0))}%`;

const getAuctionTypeLabel = (type) => (type === 'decrease' ? 'аукцион на понижение цены' : 'аукцион на повышение цены');

const getVatLabel = (pricing = {}) => (pricing.vatApplies ? 'применяется, включен в цену' : 'не применяется');

const getRegion = (auction) =>
  auction.item?.locationRegion ||
  String(auction.item?.locationAddress || '').split(',')[0]?.trim() ||
  'Не указан';

const getSellerRows = (seller = {}) => {
  const taxLabel = seller.isResident ? 'УНП' : 'ИНН/БИН';

  if (seller.accountType === 'legal_entity') {
    return [
      ['Тип продавца', 'Юридическое лицо'],
      ['Краткое наименование', seller.organizationName],
      [taxLabel, seller.unp],
      ['Юридический адрес', seller.legalAddress]
    ];
  }

  if (seller.accountType === 'entrepreneur') {
    return [
      ['Тип продавца', 'Индивидуальный предприниматель'],
      ['ФИО', seller.fullName],
      [taxLabel, seller.unp],
      ['Телефон', seller.phone]
    ];
  }

  return [
    ['Тип продавца', 'Физическое лицо'],
    ['ФИО', seller.fullName],
    ['Телефон', seller.phone],
    ['Дополнительный телефон', seller.additionalPhone]
  ];
};

const getFailedReason = ({ auction, admittedCount, bids }) => {
  if (auction.resultReason) {
    return auction.resultReason;
  }

  if (admittedCount === 0) {
    return 'отсутствуют допущенные участники';
  }

  if (bids.length === 0) {
    return auction.pricing?.auctionType === 'decrease' ? 'никто не принял цену' : 'отсутствуют ставки';
  }

  return 'условия признания торгов состоявшимися не выполнены';
};

const buildRows = (rows) =>
  rows
    .filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== '')
    .map(([label, value]) => `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`)
    .join('');

const buildCharacteristicsRows = (characteristics = []) => {
  if (!characteristics.length) {
    return '<tr><td colspan="2">Характеристики не указаны</td></tr>';
  }

  return characteristics
    .map((row) => `<tr><th>${escapeHtml(row.name)}</th><td>${escapeHtml(row.value)}</td></tr>`)
    .join('');
};

const buildList = (items = []) => items.map((item) => `<li>${escapeHtml(item)}</li>`).join('');

const buildProtocolHtml = (snapshot) => {
  const { auction, operator, participants, bids, result, payment, terms } = snapshot;

  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <title>Протокол электронных торгов № ${escapeHtml(snapshot.protocolNumber)}</title>
  <style>
    body { margin: 0; background: #f4f5f7; color: #111827; font-family: Arial, sans-serif; line-height: 1.45; }
    .document { width: min(960px, calc(100% - 40px)); margin: 24px auto; background: #fff; border: 1px solid #d8dee8; padding: 34px 42px; }
    h1, h2, h3, p { margin-top: 0; }
    h1 { font-size: 24px; text-transform: uppercase; }
    h2 { margin-top: 28px; border-bottom: 2px solid #b91c1c; padding-bottom: 8px; font-size: 19px; }
    table { width: 100%; border-collapse: collapse; margin: 12px 0; }
    th, td { border: 1px solid #d8dee8; padding: 9px 11px; text-align: left; vertical-align: top; }
    th { width: 34%; background: #f7f8fa; }
    .topline { color: #b91c1c; font-weight: 800; letter-spacing: .04em; text-transform: uppercase; }
    .meta { display: grid; gap: 6px; margin: 16px 0 0; }
    .result { border-left: 5px solid #b91c1c; background: #fff7f7; padding: 14px 16px; }
    ul { margin: 8px 0 0 22px; padding: 0; }
    @media print { body { background: #fff; } .document { width: auto; margin: 0; border: 0; } }
  </style>
</head>
<body>
  <main class="document">
    <p class="topline">Auction.by</p>
    <h1>ПРОТОКОЛ РЕЗУЛЬТАТОВ ЭЛЕКТРОННЫХ ТОРГОВ</h1>
    <div class="meta">
      <span><strong>Протокол №</strong> ${escapeHtml(snapshot.protocolNumber)}</span>
      <span><strong>Дата и время формирования:</strong> ${escapeHtml(formatDateTime(snapshot.generatedAt))}</span>
      <span><strong>Статус документа:</strong> сформирован автоматически</span>
    </div>

    <h2>1. Информация о площадке</h2>
    <table><tbody>${buildRows([
      ['Электронная площадка', 'Auction.by'],
      ['Тип документа', 'протокол результатов электронных торгов'],
      ['Способ проведения торгов', 'электронный аукцион'],
      ['Оператор торгов', operator.name],
      ['Контактное лицо', operator.contactPerson],
      ['Адрес', operator.address],
      ['Телефон', operator.phone],
      ['Электронная почта', operator.email],
      ['УНП', operator.unp]
    ])}</tbody></table>

    <h2>2. Информация о предмете торгов</h2>
    <table><tbody>${buildRows([
      ['Номер аукциона', auction.auctionNumber],
      ['Наименование предмета торгов', auction.title],
      ['Категория', auction.category],
      ['Регион', auction.region],
      ['Адрес местонахождения имущества', auction.locationAddress],
      ['Описание', auction.description || 'Описание не указано']
    ])}</tbody></table>
    <h3>Характеристики предмета торгов</h3>
    <table><tbody>${buildCharacteristicsRows(auction.characteristics)}</tbody></table>

    <h2>3. Информация о продавце</h2>
    <table><tbody>${buildRows(auction.sellerRows)}</tbody></table>

    <h2>4. Условия торгов</h2>
    <table><tbody>${buildRows([
      ['Тип торгов', auction.auctionTypeLabel],
      ['Дата и время начала приема заявок', formatDateTime(auction.schedule.applicationStartAt)],
      ['Дата и время окончания приема заявок', formatDateTime(auction.schedule.applicationEndAt)],
      ['Дата и время начала торгов', formatDateTime(auction.schedule.biddingStartAt)],
      ['Дата и время окончания торгов', formatDateTime(auction.schedule.biddingEndAt)],
      ['Начальная цена', formatMoney(auction.pricing.priceWithVat)],
      auction.pricing.auctionType === 'decrease' ? ['Минимальная цена', formatMoney(auction.pricing.minPriceWithVat)] : null,
      ['Шаг торгов', formatMoney(auction.pricing.auctionType === 'decrease' ? auction.pricing.calculatedBidStep : auction.pricing.minBidStep)],
      ['Размер задатка', formatMoney(auction.pricing.depositAmount)],
      ['НДС', auction.vatLabel],
      ['Затраты на организацию торгов', formatPercent(auction.pricing.organizationFeePercent)],
      ['Правило продления', 'ставка в последние 10 минут продлевает торги на 10 минут']
    ].filter(Boolean))}</tbody></table>

    <h2>5. Участники</h2>
    <table><tbody>${buildRows([
      ['Количество поданных заявок', participants.totalApplications],
      ['Количество допущенных участников', participants.admittedCount],
      ['Количество участников, сделавших ставки', participants.biddersCount]
    ])}</tbody></table>
    <table>
      <thead><tr><th>Участник</th><th>Статус</th></tr></thead>
      <tbody>${participants.rows.length ? participants.rows.map((row) => `<tr><td>${escapeHtml(row.label)}</td><td>${escapeHtml(row.status)}</td></tr>`).join('') : '<tr><td colspan="2">Допущенные участники отсутствуют</td></tr>'}</tbody>
    </table>

    <h2>6. Ход торгов / история ставок</h2>
    <table>
      <thead><tr><th>Участник</th><th>Дата и время</th><th>Сумма</th><th>Изменение</th></tr></thead>
      <tbody>${bids.length ? bids.map((bid) => `<tr><td>${escapeHtml(bid.participantLabel)}</td><td>${escapeHtml(formatDateTime(bid.createdAt))}</td><td>${escapeHtml(formatMoney(bid.amount))}</td><td>${escapeHtml(formatMoney(bid.increment))}</td></tr>`).join('') : '<tr><td colspan="4">Ставки не совершались</td></tr>'}</tbody>
    </table>

    <h2>7. Результат торгов</h2>
    <div class="result">
      <table><tbody>${buildRows([
        ['Статус торгов', result.statusLabel],
        result.winnerLabel ? ['Победитель', result.winnerLabel] : null,
        result.finalPrice ? ['Финальная цена торгов', formatMoney(result.finalPrice)] : null,
        result.winnerDeterminedAt ? ['Дата и время определения победителя', formatDateTime(result.winnerDeterminedAt)] : null,
        result.reason ? ['Причина', result.reason] : null
      ].filter(Boolean))}</tbody></table>
    </div>

    <h2>8. Расчет оплаты</h2>
    <table><tbody>${buildRows([
      ['Финальная цена', payment.finalPrice ? formatMoney(payment.finalPrice) : 'Не применяется'],
      ['Внесенный задаток победителя', payment.depositAmount ? formatMoney(payment.depositAmount) : 'Не применяется'],
      ['Сумма к полной оплате победителем', payment.dueAmount ? formatMoney(payment.dueAmount) : 'Не применяется'],
      ['Возврат задатков проигравшим участникам', payment.refundRule]
    ])}</tbody></table>

    <h2>9. Дальнейшие действия</h2>
    <h3>Обязанности покупателя и продавца</h3>
    <ul>${buildList(terms.obligations)}</ul>
    <h3>Ответственность покупателя и продавца</h3>
    <ul>${buildList(terms.responsibility)}</ul>
  </main>
</body>
</html>`;
};

const buildSnapshot = async (auction, generatedAt) => {
  const [applications, bids, winnerDeposit] = await Promise.all([
    AuctionApplication.find({ auction: auction._id }).sort({ createdAt: 1 }),
    Bid.find({ auction: auction._id }).sort({ createdAt: 1 }),
    auction.winner ? Deposit.findOne({ auction: auction._id, payer: auction.winner, status: 'paid' }) : null
  ]);
  const admittedApplications = applications.filter((application) => application.status === 'approved' && application.participantNumber);
  const participantLabelByNumber = new Map(
    admittedApplications.map((application, index) => [Number(application.participantNumber), `Участник №${index + 1}`])
  );
  const bidders = new Set(bids.map((bid) => Number(bid.participantNumber)).filter(Boolean));
  const finalPrice = auction.status === 'finished_success'
    ? Number(auction.winningBidAmount || bids[bids.length - 1]?.amount || 0)
    : 0;
  const depositAmount = auction.status === 'finished_success' ? Number(winnerDeposit?.amount || auction.pricing?.depositAmount || 0) : 0;
  const failedReason = getFailedReason({ auction, admittedCount: admittedApplications.length, bids });

  return {
    protocolNumber: auction.auctionNumber,
    generatedAt,
    status: 'generated',
    operator: operatorInfo,
    auction: {
      id: auction._id.toString(),
      auctionNumber: auction.auctionNumber,
      title: auction.item?.title || 'Предмет торгов без названия',
      category: auctionCategoryLabels[auction.item?.category] || auction.item?.category || 'Не указана',
      region: getRegion(auction),
      locationAddress: auction.item?.locationAddress || 'Не указан',
      description: auction.item?.description || '',
      characteristics: auction.item?.characteristics || [],
      auctionTypeLabel: getAuctionTypeLabel(auction.pricing?.auctionType),
      pricing: auction.pricing || {},
      schedule: auction.schedule || {},
      vatLabel: getVatLabel(auction.pricing),
      sellerRows: getSellerRows(auction.seller || {})
    },
    participants: {
      totalApplications: applications.length,
      admittedCount: admittedApplications.length,
      biddersCount: bidders.size,
      rows: admittedApplications.map((application) => ({
        participantNumber: application.participantNumber,
        label: participantLabelByNumber.get(Number(application.participantNumber)),
        status: 'допущен'
      }))
    },
    bids: bids.map((bid) => ({
      participantNumber: bid.participantNumber,
      participantLabel: participantLabelByNumber.get(Number(bid.participantNumber)) || 'Участник',
      createdAt: bid.createdAt,
      amount: bid.amount,
      increment: bid.increment || 0
    })),
    result: auction.status === 'finished_success'
      ? {
          statusLabel: 'состоялись',
          winnerLabel: participantLabelByNumber.get(Number(auction.winnerParticipantNumber)) || 'Участник',
          finalPrice,
          winnerDeterminedAt: auction.winningBidAt || bids[bids.length - 1]?.createdAt || auction.schedule?.biddingEndAt,
          reason: ''
        }
      : {
          statusLabel: 'не состоялись',
          reason: failedReason
        },
    payment: {
      finalPrice,
      depositAmount,
      dueAmount: Math.max(finalPrice - depositAmount, 0),
      refundRule: auction.status === 'finished_success'
        ? 'Задатки участников, не признанных победителями, подлежат возврату.'
        : 'Задатки допущенных участников подлежат возврату в установленном порядке.'
    },
    terms: buyerTerms
  };
};

const ensureAuctionProtocol = async (auctionOrId) => {
  const auction = typeof auctionOrId === 'object' && auctionOrId?._id
    ? auctionOrId
    : await Auction.findById(auctionOrId);

  if (!auction || !finishedProtocolStatuses.includes(auction.status) || !auction.auctionNumber) {
    return null;
  }

  const existing = await AuctionProtocol.findOne({ auction: auction._id });
  if (existing) {
    return existing;
  }

  const generatedAt = await getCurrentTime();
  const snapshot = await buildSnapshot(auction, generatedAt);
  const contentHtml = buildProtocolHtml(snapshot);

  try {
    return await AuctionProtocol.create({
      auction: auction._id,
      auctionNumber: auction.auctionNumber,
      protocolNumber: auction.auctionNumber,
      generatedAt,
      resultStatus: auction.status,
      snapshot,
      contentHtml
    });
  } catch (error) {
    if (error.code === 11000) {
      return AuctionProtocol.findOne({ auction: auction._id });
    }

    throw error;
  }
};

module.exports = {
  ensureAuctionProtocol
};
