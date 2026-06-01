const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const envArg = process.argv[2] || 'all';
const envMap = {
  dev: 'development',
  development: 'development',
  test: 'test'
};

if (envArg === 'all') {
  for (const target of ['test', 'development']) {
    const result = spawnSync(process.execPath, [__filename, target], { stdio: 'inherit' });
    if (result.status !== 0) {
      process.exit(result.status || 1);
    }
  }
  process.exit(0);
}

process.env.NODE_ENV = envMap[envArg] || envArg;

const bcrypt = require('bcryptjs');
const { connectDatabase, disconnectDatabase } = require('../backend/src/config/database');
const { ensureAdminAccount } = require('../backend/src/services/adminSeedService');
const Auction = require('../backend/src/models/Auction');
const AuctionApplication = require('../backend/src/models/AuctionApplication');
const AuctionReview = require('../backend/src/models/AuctionReview');
const Bid = require('../backend/src/models/Bid');
const Counter = require('../backend/src/models/Counter');
const Deposit = require('../backend/src/models/Deposit');
const User = require('../backend/src/models/User');
const VerificationRequest = require('../backend/src/models/VerificationRequest');
const VerificationReview = require('../backend/src/models/VerificationReview');
const { formatAuction } = require('../backend/src/utils/auctionFormatters');
const { resetTimeOffset } = require('../backend/src/services/timeService');

const password = 'Demo12345';
const uploadRoot = path.join(process.cwd(), 'backend', 'uploads');
const auctionUploadDir = path.join(uploadRoot, 'auctions');
const verificationUploadDir = path.join(uploadRoot, 'verification');
const currentYear = new Date().getFullYear();

const moderators = [
  { email: 'moderator1@auction.by', name: 'Модератор 1' },
  { email: 'moderator2@auction.by', name: 'Модератор 2' }
];

const demoUsers = [
  {
    email: 'individual.resident@auction.by',
    accountType: 'individual',
    isResident: true,
    firstName: 'Иван',
    lastName: 'Петров',
    middleName: 'Сергеевич',
    phone: '375291110001',
    additionalPhone: '375291120001',
    address: 'г. Минск, ул. Октябрьская, д. 10, кв. 18',
    country: 'Республика Беларусь'
  },
  {
    email: 'individual.nonresident@auction.by',
    accountType: 'individual',
    isResident: false,
    firstName: 'Алексей',
    lastName: 'Коваленко',
    middleName: 'Игоревич',
    phone: '375291110002',
    additionalPhone: '375291120002',
    address: 'г. Москва, ул. Тверская, д. 7, кв. 21',
    country: 'Российская Федерация'
  },
  {
    email: 'company.resident@auction.by',
    accountType: 'legal_entity',
    isResident: true,
    shortName: 'ООО "Минск Трейд"',
    fullName: 'Общество с ограниченной ответственностью "Минск Трейд"',
    directorFullName: 'Громов Павел Викторович',
    directorPosition: 'Директор',
    directorBasis: 'charter',
    unp: '193000001',
    phone: '375291110003',
    address: 'г. Минск, ул. Кальварийская, д. 17, офис 401',
    country: 'Республика Беларусь'
  },
  {
    email: 'company.nonresident@auction.by',
    accountType: 'legal_entity',
    isResident: false,
    shortName: 'Baltic Assets Ltd',
    fullName: 'Baltic Assets Limited Liability Company',
    directorFullName: 'Arturs Ozolins',
    directorPosition: 'Managing Director',
    directorBasis: 'power_of_attorney',
    chiefAccountantFullName: 'Inese Berzina',
    chiefAccountantPhone: '375291120004',
    taxId: 'LV40003000001',
    phone: '375291110004',
    address: 'Латвия, г. Рига, ул. Бривибас, д. 55, офис 12',
    country: 'Латвия'
  },
  {
    email: 'entrepreneur.resident@auction.by',
    accountType: 'entrepreneur',
    isResident: true,
    firstName: 'Михаил',
    lastName: 'Бас',
    middleName: 'Андреевич',
    unp: '193000005',
    phone: '375291110005',
    additionalPhone: '375291120005',
    address: 'г. Минск, ул. Калиновского, д. 79, кв. 8',
    country: 'Республика Беларусь'
  },
  {
    email: 'entrepreneur.nonresident@auction.by',
    accountType: 'entrepreneur',
    isResident: false,
    firstName: 'Никита',
    lastName: 'Смирнов',
    middleName: 'Олегович',
    taxId: 'RU770000000006',
    phone: '375291110006',
    additionalPhone: '375291120006',
    address: 'Российская Федерация, г. Санкт-Петербург, Невский пр-т, д. 44',
    country: 'Российская Федерация'
  },
  {
    email: 'individual2.resident@auction.by',
    accountType: 'individual',
    isResident: true,
    firstName: 'Анна',
    lastName: 'Савицкая',
    middleName: 'Олеговна',
    phone: '375291110007',
    additionalPhone: '375291120007',
    address: 'г. Гродно, ул. Замковая, д. 4, кв. 12',
    country: 'Республика Беларусь'
  },
  {
    email: 'company2.resident@auction.by',
    accountType: 'legal_entity',
    isResident: true,
    shortName: 'ЗАО "ТехноПарк"',
    fullName: 'Закрытое акционерное общество "ТехноПарк"',
    directorFullName: 'Климов Денис Андреевич',
    directorPosition: 'Генеральный директор',
    directorBasis: 'charter',
    unp: '193000008',
    phone: '375291110008',
    address: 'г. Витебск, ул. Гагарина, д. 31, офис 6',
    country: 'Республика Беларусь'
  },
  {
    email: 'entrepreneur2.resident@auction.by',
    accountType: 'entrepreneur',
    isResident: true,
    firstName: 'Ольга',
    lastName: 'Романова',
    middleName: 'Петровна',
    unp: '193000009',
    phone: '375291110009',
    additionalPhone: '375291120009',
    address: 'г. Брест, ул. Советская, д. 83, кв. 5',
    country: 'Республика Беларусь'
  },
  {
    email: 'individual2.nonresident@auction.by',
    accountType: 'individual',
    isResident: false,
    firstName: 'Марина',
    lastName: 'Волкова',
    middleName: 'Александровна',
    phone: '375291110010',
    additionalPhone: '375291120010',
    address: 'Республика Казахстан, г. Алматы, пр-т Абая, д. 25, кв. 44',
    country: 'Республика Казахстан'
  }
];

const lotTemplates = [
  {
    category: 'passenger_cars',
    title: 'Volkswagen Passat B8 2019',
    address: 'г. Минск, ул. Машиностроителей, д. 12',
    geoLocation: { lat: 53.8621, lng: 27.6496 },
    characteristics: [
      ['Год выпуска', '2019'],
      ['Марка и модель', 'Volkswagen Passat B8'],
      ['Тип двигателя', 'дизель'],
      ['Пробег', '124 000 км'],
      ['Состояние', 'хорошее']
    ]
  },
  {
    category: 'trucks',
    title: 'MAN TGS 26.440',
    address: 'Минская обл., г. Смолевичи, ул. Промышленная, д. 9',
    geoLocation: { lat: 54.0242, lng: 28.0865 },
    characteristics: [
      ['Год выпуска', '2016'],
      ['Марка и модель', 'MAN TGS 26.440'],
      ['Грузоподъемность', '18 т'],
      ['Пробег', '410 000 км'],
      ['Состояние', 'рабочее']
    ]
  },
  {
    category: 'electronics',
    title: 'Комплект серверного оборудования Dell',
    address: 'г. Минск, пр-т Независимости, д. 117А',
    geoLocation: { lat: 53.9344, lng: 27.6511 },
    characteristics: [
      ['Тип устройства', 'серверное оборудование'],
      ['Бренд', 'Dell'],
      ['Модель', 'PowerEdge R740'],
      ['Комплектация', 'стойка, ИБП, коммутатор'],
      ['Состояние', 'рабочее']
    ]
  },
  {
    category: 'real_estate',
    title: 'Складское помещение 420 м2',
    address: 'Минская обл., г. Дзержинск, ул. Промышленная, д. 4',
    geoLocation: { lat: 53.6824, lng: 27.1351 },
    characteristics: [
      ['Тип недвижимости', 'склад'],
      ['Общая площадь', '420 м2'],
      ['Этаж', '1'],
      ['Коммуникации', 'электричество, отопление'],
      ['Состояние', 'удовлетворительное']
    ]
  },
  {
    category: 'machines_equipment',
    title: 'Токарный станок 16К20',
    address: 'г. Гомель, ул. Барыкина, д. 301',
    geoLocation: { lat: 52.4177, lng: 31.0159 },
    characteristics: [
      ['Наименование оборудования', 'токарный станок'],
      ['Производитель', 'Красный пролетарий'],
      ['Модель', '16К20'],
      ['Год выпуска', '1991'],
      ['Техническое состояние', 'требует обслуживания']
    ]
  },
  {
    category: 'jewelry',
    title: 'Золотые часы с бриллиантами',
    address: 'г. Брест, ул. Советская, д. 83',
    geoLocation: { lat: 52.0976, lng: 23.7341 },
    characteristics: [
      ['Тип изделия', 'часы'],
      ['Материал', 'золото 585'],
      ['Вес', '84 г'],
      ['Камни/вставки', 'бриллианты'],
      ['Состояние', 'отличное']
    ]
  },
  {
    category: 'art',
    title: 'Картина белорусского художника',
    address: 'г. Гродно, ул. Замковая, д. 4',
    geoLocation: { lat: 53.6778, lng: 23.8295 },
    characteristics: [
      ['Вид искусства', 'живопись'],
      ['Материал', 'холст, масло'],
      ['Размер', '80x60 см'],
      ['Год создания', '1987'],
      ['Состояние', 'хорошее']
    ]
  },
  {
    category: 'books',
    title: 'Коллекция редких книг',
    address: 'г. Витебск, ул. Суворова, д. 18',
    geoLocation: { lat: 55.1904, lng: 30.2049 },
    characteristics: [
      ['Количество', '42 экземпляра'],
      ['Тематика', 'история Беларуси'],
      ['Период', '1905-1978'],
      ['Состояние', 'разное'],
      ['Язык', 'русский, белорусский']
    ]
  },
  {
    category: 'clothes',
    title: 'Партия спецодежды новая',
    address: 'г. Могилев, ул. Первомайская, д. 63',
    geoLocation: { lat: 53.8945, lng: 30.3307 },
    characteristics: [
      ['Тип товара', 'спецодежда'],
      ['Количество', '180 комплектов'],
      ['Размеры', '48-56'],
      ['Состояние', 'новое'],
      ['Материал', 'смесовая ткань']
    ]
  },
  {
    category: 'other_property',
    title: 'Офисная мебель комплектом',
    address: 'г. Минск, ул. Куйбышева, д. 22',
    geoLocation: { lat: 53.9187, lng: 27.5748 },
    characteristics: [
      ['Тип имущества', 'офисная мебель'],
      ['Количество предметов', '36'],
      ['Материал', 'ЛДСП, металл'],
      ['Состояние', 'хорошее'],
      ['Комплектность', 'столы, шкафы, тумбы']
    ]
  }
];

const statusCycle = [
  'draft',
  'pending',
  'returned',
  'application_waiting',
  'applications_open',
  'application_waiting',
  'applications_open',
  'application_waiting',
  'applications_open',
  'bidding_waiting',
  'bidding_active',
  'finished_success',
  'finished_failed',
  'cancelled'
];

const ensureDirs = () => {
  fs.mkdirSync(auctionUploadDir, { recursive: true });
  fs.mkdirSync(verificationUploadDir, { recursive: true });
};

const escapeXml = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const writeSvg = ({ dir, fileName, title, subtitle, color }) => {
  const filePath = path.join(dir, fileName);
  const content = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="750" viewBox="0 0 1200 750">
  <rect width="1200" height="750" fill="${color}"/>
  <circle cx="1040" cy="130" r="120" fill="rgba(255,255,255,.18)"/>
  <circle cx="160" cy="620" r="180" fill="rgba(255,255,255,.14)"/>
  <text x="80" y="330" fill="#fff" font-family="Arial, sans-serif" font-size="58" font-weight="700">${escapeXml(title)}</text>
  <text x="80" y="410" fill="rgba(255,255,255,.88)" font-family="Arial, sans-serif" font-size="34">${escapeXml(subtitle)}</text>
</svg>`;
  fs.writeFileSync(filePath, content);

  return {
    fieldName: 'file',
    originalName: fileName,
    mimeType: 'image/svg+xml',
    size: Buffer.byteLength(content),
    path: filePath
  };
};

const makeDate = (days, hours, minutes = 0) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hours, minutes, 0, 0);
  return date;
};

const joinName = (userSeed) =>
  [userSeed.lastName, userSeed.firstName, userSeed.middleName].filter(Boolean).join(' ');

const makeIban = (index) => `BY${String(10 + (index % 80)).padStart(2, '0')}AKBB3012${String(1000000000000000 + index).padStart(16, '0')}`;

const hashPassword = () => bcrypt.hash(password, 10);

const makeVerificationDocs = (userSeed, index, suffix = 'approved') => {
  const base = `${process.env.NODE_ENV}-verification-${index}-${suffix}`;
  const fields = [];

  if (userSeed.accountType === 'legal_entity') {
    fields.push(
      [userSeed.isResident ? 'charter' : 'taxCertificate', userSeed.isResident ? 'Устав организации' : 'Свидетельство о постановке на учет'],
      ['stateRegistrationCertificate', 'Свидетельство о регистрации'],
      ['directorAppointmentOrder', 'Документ о назначении руководителя']
    );
  } else {
    fields.push(
      ['documentRegistration', 'Прописка или временная регистрация'],
      ['documentMain', 'Основной документ'],
      ['documentBack', 'Обратная сторона документа'],
      ['documentExtra', 'Селфи с документом']
    );

    if (userSeed.accountType === 'entrepreneur') {
      fields.push(['registrationCertificate', 'Свидетельство о регистрации ИП']);
    }
  }

  return fields.map(([fieldName, title], docIndex) => {
    const fileName = `${base}-${fieldName}.svg`;
    const file = writeSvg({
      dir: verificationUploadDir,
      fileName,
      title,
      subtitle: userSeed.email,
      color: ['#b91c1c', '#0f766e', '#334155', '#7c3aed', '#92400e'][docIndex % 5]
    });

    return { ...file, fieldName };
  });
};

const makeAuctionPhotos = ({ ownerIndex, lotIndex, title, category }) => {
  const count = 2 + ((ownerIndex + lotIndex) % 4);

  return Array.from({ length: count }, (_, photoIndex) => {
    const fileName = `${process.env.NODE_ENV}-auction-${ownerIndex + 1}-${lotIndex + 1}-${photoIndex + 1}.svg`;
    const file = writeSvg({
      dir: auctionUploadDir,
      fileName,
      title,
      subtitle: `${category} / фото ${photoIndex + 1}`,
      color: ['#991b1b', '#1d4ed8', '#047857', '#92400e', '#6d28d9', '#0f766e'][(ownerIndex + lotIndex + photoIndex) % 6]
    });

    return {
      ...file,
      fieldName: 'photos',
      isMain: photoIndex === 0,
      order: photoIndex
    };
  });
};

const makeVerificationData = (userSeed, index) => {
  const fullName = joinName(userSeed);
  const isLegal = userSeed.accountType === 'legal_entity';

  const personalData = {
    firstName: userSeed.firstName || '',
    lastName: userSeed.lastName || '',
    middleName: userSeed.middleName || '',
    fullName,
    phone: userSeed.phone,
    additionalPhone: userSeed.additionalPhone || `37529112${String(index).padStart(4, '0')}`,
    notificationEmail: userSeed.email,
    postalAddress: isLegal ? '' : userSeed.address
  };

  const organizationData = {
    fullName: userSeed.fullName || '',
    shortName: userSeed.shortName || '',
    unp: userSeed.isResident ? userSeed.unp || '' : '',
    taxId: userSeed.isResident ? '' : userSeed.taxId || '',
    registrationDate: userSeed.isResident ? '2021-04-12' : '',
    directorFullName: userSeed.directorFullName || '',
    directorPosition: userSeed.directorPosition || '',
    directorBasis: userSeed.directorBasis || 'charter',
    chiefAccountantFullName: userSeed.chiefAccountantFullName || '',
    chiefAccountantPhone: userSeed.chiefAccountantPhone || ''
  };

  if (userSeed.accountType === 'entrepreneur') {
    organizationData.unp = userSeed.isResident ? userSeed.unp || '' : '';
    organizationData.taxId = userSeed.isResident ? '' : userSeed.taxId || '';
    organizationData.registrationDate = userSeed.isResident ? '2022-02-18' : '';
  }

  return {
    personalData,
    organizationData,
    addressData: {
      country: userSeed.country,
      mailingCountry: userSeed.country,
      mailingAddress: userSeed.address,
      legalAddress: isLegal ? userSeed.address : '',
      postalAddress: isLegal ? userSeed.address : ''
    },
    documentData: {
      documentType: 'passport',
      documentNumber: `MP${String(1000000 + index * 137).padStart(7, '0')}`,
      personalNumber: `${String(10000000000000 + index * 91137).padStart(14, '0')}`,
      issuedBy: userSeed.isResident ? 'Центральный РОВД г. Минска' : 'Компетентный орган страны регистрации',
      issuedAt: '2018-03-15',
      expiresAt: userSeed.isResident ? '2028-03-15' : ''
    },
    bankData: {
      iban: makeIban(index),
      bankName: index % 2 === 0 ? 'ЗАО "Альфа-Банк"' : 'ОАО "Белинвестбанк"',
      bankUnp: index % 2 === 0 ? '101541947' : '100635551',
      bankBic: index % 2 === 0 ? 'ALFABY2X' : 'BLBBBY2X',
      transitIban: userSeed.isResident ? '' : makeIban(index + 500),
      transitBankName: userSeed.isResident ? '' : 'ЗАО "Альфа-Банк"',
      transitBankBic: userSeed.isResident ? '' : 'ALFABY2X'
    }
  };
};

const sellerFromVerification = (userSeed, verificationData) => {
  const fullName = verificationData.personalData.fullName;

  if (userSeed.accountType === 'legal_entity') {
    return {
      accountType: userSeed.accountType,
      isResident: userSeed.isResident,
      organizationName: verificationData.organizationData.shortName || verificationData.organizationData.fullName,
      unp: verificationData.organizationData.unp || verificationData.organizationData.taxId,
      legalAddress: verificationData.addressData.legalAddress
    };
  }

  if (userSeed.accountType === 'entrepreneur') {
    return {
      accountType: userSeed.accountType,
      isResident: userSeed.isResident,
      fullName,
      phone: userSeed.phone,
      unp: verificationData.organizationData.unp || verificationData.organizationData.taxId
    };
  }

  return {
    accountType: userSeed.accountType,
    isResident: userSeed.isResident,
    fullName,
    phone: userSeed.phone,
    additionalPhone: verificationData.personalData.additionalPhone
  };
};

const scheduleForStatus = (status) => {
  if (status === 'application_waiting') {
    return {
      applicationStartAt: makeDate(2, 9),
      applicationEndAt: makeDate(6, 19),
      biddingStartAt: makeDate(7, 10),
      biddingEndAt: makeDate(7, 16)
    };
  }

  if (status === 'applications_open') {
    return {
      applicationStartAt: makeDate(-1, 9),
      applicationEndAt: makeDate(2, 19),
      biddingStartAt: makeDate(3, 10),
      biddingEndAt: makeDate(3, 16)
    };
  }

  if (status === 'bidding_waiting') {
    return {
      applicationStartAt: makeDate(-5, 9),
      applicationEndAt: makeDate(-1, 19),
      biddingStartAt: makeDate(0, 16),
      biddingEndAt: makeDate(0, 19)
    };
  }

  if (status === 'bidding_active') {
    return {
      applicationStartAt: makeDate(-6, 9),
      applicationEndAt: makeDate(-2, 19),
      biddingStartAt: makeDate(0, 9),
      biddingEndAt: makeDate(0, 19)
    };
  }

  if (['finished_success', 'finished_failed'].includes(status)) {
    return {
      applicationStartAt: makeDate(-12, 9),
      applicationEndAt: makeDate(-8, 19),
      biddingStartAt: makeDate(-7, 10),
      biddingEndAt: makeDate(-7, 16)
    };
  }

  return {
    applicationStartAt: makeDate(1, 9),
    applicationEndAt: makeDate(5, 19),
    biddingStartAt: makeDate(6, 10),
    biddingEndAt: makeDate(6, 16)
  };
};

const buildAuction = ({ owner, ownerSeed, ownerIndex, lotIndex, verificationData, status, lotNumber = null, previousRejection = false }) => {
  const template = lotTemplates[(ownerIndex + lotIndex) % lotTemplates.length];
  const vatApplies = ['legal_entity', 'entrepreneur'].includes(ownerSeed.accountType);
  const priceWithVat = 2500 + ownerIndex * 1600 + lotIndex * 850;
  const auctionType = lotIndex % 2 === 0 ? 'increase' : 'decrease';
  const minPriceWithVat = auctionType === 'decrease' ? Math.round(priceWithVat * 0.7) : null;
  const bidStepsCount = auctionType === 'decrease' ? 8 + (lotIndex % 8) : null;
  const title = `${template.title} ${ownerIndex + 1}.${lotIndex + 1}`;

  return {
    owner: owner._id,
    lotNumber,
    status,
    moderationComment: status === 'returned' ? 'Причина отклонения: требуется уточнить описание и приложить фото лучшего качества.' : '',
    pricing: {
      auctionType,
      priceWithoutVat: vatApplies ? Number((priceWithVat / 1.2).toFixed(2)) : priceWithVat,
      priceWithVat,
      minPriceWithVat,
      vatApplies,
      vatRate: vatApplies ? 0.2 : 0,
      vatLabel: vatApplies ? 'НДС включен в цену' : 'Не облагается налогом на добавочную стоимость',
      depositAmount: Math.round(priceWithVat * 0.1),
      minBidStep: auctionType === 'increase' ? Math.max(50, Math.round(priceWithVat * 0.04)) : null,
      bidStepsCount,
      calculatedBidStep: auctionType === 'decrease' ? Math.round((priceWithVat - minPriceWithVat) / bidStepsCount) : null,
      organizationFeePercent: 1
    },
    schedule: {
      ...scheduleForStatus(status),
      paymentDeadlineDays: 10 + (lotIndex % 20),
      contractDeadlineDays: 12 + (lotIndex % 20)
    },
    item: {
      title,
      category: template.category,
      characteristics: template.characteristics.map(([name, value]) => ({ name, value })),
      description: `Демо-лот для проверки каталога, карточек, модерации и страницы лота. Продавец: ${ownerSeed.email}. ${previousRejection ? 'Ранее заявка возвращалась на доработку и была отправлена повторно.' : ''}`,
      locationAddress: template.address,
      geoLocation: template.geoLocation
    },
    photos: makeAuctionPhotos({ ownerIndex, lotIndex, title, category: template.category }),
    inspection: {
      contactName: verificationData.personalData.fullName || verificationData.organizationData.directorFullName,
      contactPhone: ownerSeed.phone,
      contactEmail: verificationData.personalData.notificationEmail
    },
    seller: sellerFromVerification(ownerSeed, verificationData),
    submittedAt: ['draft', 'cancelled'].includes(status) ? null : makeDate(-1, 12),
    reviewedBy: null,
    reviewedAt: null
  };
};

const cleanupDatabase = async () => {
  await AuctionApplication.deleteMany({});
  await Bid.deleteMany({});
  await Deposit.deleteMany({});
  await AuctionReview.deleteMany({});
  await Auction.deleteMany({});
  await VerificationReview.deleteMany({});
  await VerificationRequest.deleteMany({});
  await Counter.deleteMany({});
  await User.deleteMany({ role: { $ne: 'admin' } });
  await resetTimeOffset();
};

const createRejectedVerificationHistory = async ({ user, userSeed, moderator, userIndex }) => {
  const rejectedData = makeVerificationData(userSeed, userIndex + 100);
  if (userSeed.accountType === 'individual' || userSeed.accountType === 'entrepreneur') {
    rejectedData.personalData.postalAddress = '';
  }
  if (userSeed.accountType === 'legal_entity') {
    rejectedData.organizationData.directorFullName = '';
  }

  const rejected = await VerificationRequest.create({
    user: user._id,
    accountType: userSeed.accountType,
    isResident: userSeed.isResident,
    status: 'rejected',
    ...rejectedData,
    documents: makeVerificationDocs(userSeed, userIndex + 100, 'rejected'),
    submittedAt: makeDate(-28 + userIndex, 10),
    moderationComment: 'Причина отказа: не заполнены обязательные данные и требуется повторно загрузить документы.',
    reviewedBy: moderator._id,
    reviewedAt: makeDate(-27 + userIndex, 16)
  });

  await VerificationReview.create({
    verificationRequest: rejected._id,
    user: user._id,
    moderator: moderator._id,
    action: 'rejected',
    comment: rejected.moderationComment
  });
};

const approveVerification = async ({ user, userSeed, moderator, userIndex }) => {
  const verificationData = makeVerificationData(userSeed, userIndex + 1);
  const verification = await VerificationRequest.create({
    user: user._id,
    accountType: userSeed.accountType,
    isResident: userSeed.isResident,
    status: 'approved',
    ...verificationData,
    documents: makeVerificationDocs(userSeed, userIndex + 1, 'approved'),
    submittedAt: makeDate(-20 + userIndex, 11),
    reviewedBy: moderator._id,
    reviewedAt: makeDate(-19 + userIndex, 14)
  });

  await VerificationReview.create({
    verificationRequest: verification._id,
    user: user._id,
    moderator: moderator._id,
    action: 'approved',
    comment: 'Данные проверены, заявка одобрена.'
  });

  return { verification, verificationData };
};

const addReviewForAuction = async ({ auction, moderator, action, comment, snapshotStatus = 'pending' }) => {
  const snapshot = formatAuction({
    ...auction.toObject(),
    status: snapshotStatus,
    lotNumber: null,
    moderationComment: action === 'returned' ? comment : '',
    reviewedBy: null,
    reviewedAt: null
  });

  await AuctionReview.create({
    auction: auction._id,
    owner: auction.owner,
    moderator: moderator?._id || null,
    action,
    comment,
    auctionSnapshot: snapshot
  });
};

const seedParticipation = async ({ auction, users, index }) => {
  if (!['applications_open', 'bidding_waiting', 'bidding_active', 'finished_success', 'finished_failed'].includes(auction.status)) {
    return;
  }

  const participantCount = auction.status === 'applications_open' ? 2 : 3;
  const participants = Array.from({ length: participantCount }, (_, offset) => users[(index + offset + 1) % users.length].user);

  for (let participantIndex = 0; participantIndex < participants.length; participantIndex += 1) {
    const participant = participants[participantIndex];
    const applicationStatus = auction.status === 'applications_open' && participantIndex === 0 ? 'deposit_required' : 'approved';

    await AuctionApplication.create({
      auction: auction._id,
      participant: participant._id,
      status: applicationStatus
    });

    await Deposit.create({
      auction: auction._id,
      payer: participant._id,
      amount: auction.pricing.depositAmount,
      status: applicationStatus === 'deposit_required' ? 'pending' : auction.status === 'finished_success' && participantIndex > 0 ? 'refunded' : 'paid',
      paidAt: applicationStatus === 'deposit_required' ? null : makeDate(-1, 13)
    });

    if (['bidding_active', 'finished_success'].includes(auction.status)) {
      await Bid.create({
        auction: auction._id,
        bidder: participant._id,
        amount: auction.pricing.priceWithVat + auction.pricing.minBidStep * (participantIndex + 1)
      });
    }
  }
};

const seed = async () => {
  ensureDirs();
  await connectDatabase();
  await cleanupDatabase();

  const admin = await ensureAdminAccount();
  const passwordHash = await hashPassword();

  const createdModerators = [];
  for (const moderatorSeed of moderators) {
    const moderator = await User.create({
      email: moderatorSeed.email,
      passwordHash,
      role: 'moderator',
      isEmailVerified: true,
      emailVerifiedAt: new Date(),
      verificationStatus: 'approved',
      isActive: true,
      createdBy: admin._id,
      lastSeenAt: new Date()
    });
    createdModerators.push(moderator);
  }

  const createdUsers = [];
  for (let index = 0; index < demoUsers.length; index += 1) {
    const userSeed = demoUsers[index];
    const moderator = createdModerators[index % createdModerators.length];
    const user = await User.create({
      email: userSeed.email,
      passwordHash,
      role: 'user',
      accountType: userSeed.accountType,
      isResident: userSeed.isResident,
      isEmailVerified: true,
      emailVerifiedAt: new Date(),
      verificationStatus: 'approved',
      isActive: true
    });

    if ([0, 1, 2, 3, 5].includes(index)) {
      await createRejectedVerificationHistory({ user, userSeed, moderator, userIndex: index });
    }

    const { verificationData } = await approveVerification({ user, userSeed, moderator, userIndex: index });
    createdUsers.push({ user, seed: userSeed, verificationData });
  }

  const createdAuctions = [];
  let lotSequence = 0;

  for (let ownerIndex = 0; ownerIndex < createdUsers.length; ownerIndex += 1) {
    const ownerBundle = createdUsers[ownerIndex];
    const lotsCount = 5 + ownerIndex;

    for (let lotIndex = 0; lotIndex < lotsCount; lotIndex += 1) {
      const requestedStatus = statusCycle[(ownerIndex + lotIndex) % statusCycle.length];
      const moderator = createdModerators[(ownerIndex + lotIndex) % createdModerators.length];
      const isPublished = ['application_waiting', 'applications_open', 'bidding_waiting', 'bidding_active', 'finished_success', 'finished_failed'].includes(requestedStatus);
      const hadPreviousRejection = isPublished && (ownerIndex + lotIndex) % 4 === 0;
      const lotNumber = isPublished ? `${currentYear}-${String(++lotSequence).padStart(6, '0')}` : null;

      const auctionData = buildAuction({
        owner: ownerBundle.user,
        ownerSeed: ownerBundle.seed,
        ownerIndex,
        lotIndex,
        verificationData: ownerBundle.verificationData,
        status: requestedStatus,
        lotNumber,
        previousRejection: hadPreviousRejection
      });

      if (['returned', 'cancelled'].includes(requestedStatus)) {
        auctionData.reviewedBy = moderator._id;
        auctionData.reviewedAt = makeDate(-1, 16);
      }

      if (requestedStatus === 'pending') {
        auctionData.submittedAt = new Date(Date.now() - 2 * 60 * 60 * 1000);
      }

      if (isPublished) {
        auctionData.reviewedBy = moderator._id;
        auctionData.reviewedAt = makeDate(-2, 16);
      }

      const auction = await Auction.create(auctionData);
      createdAuctions.push(auction);

      if (requestedStatus === 'returned') {
        await addReviewForAuction({
          auction,
          moderator,
          action: 'returned',
          comment: auction.moderationComment,
          snapshotStatus: 'pending'
        });
      }

      if (hadPreviousRejection) {
        await addReviewForAuction({
          auction,
          moderator,
          action: 'returned',
          comment: 'Причина отклонения: не хватало фотографий предмета торгов и уточнения по адресу осмотра.',
          snapshotStatus: 'pending'
        });
      }

      if (isPublished) {
        await addReviewForAuction({
          auction,
          moderator,
          action: 'approved',
          comment: hadPreviousRejection ? 'После доработки заявка одобрена.' : 'Заявка на публикацию лота одобрена.',
          snapshotStatus: 'pending'
        });
      }
    }
  }

  await Counter.findOneAndUpdate(
    { key: `lot-number:${currentYear}` },
    { $set: { key: `lot-number:${currentYear}`, value: lotSequence } },
    { upsert: true }
  );

  const activeAuctions = createdAuctions.filter((auction) =>
    ['applications_open', 'bidding_waiting', 'bidding_active', 'finished_success', 'finished_failed'].includes(auction.status)
  );

  for (let index = 0; index < activeAuctions.length; index += 1) {
    await seedParticipation({ auction: activeAuctions[index], users: createdUsers, index });
  }

  const accounts = [
    ...createdModerators.map((moderator) => ({ role: 'moderator', email: moderator.email, password })),
    ...createdUsers.map(({ user, seed }) => ({
      role: seed.accountType,
      resident: seed.isResident,
      email: user.email,
      password
    }))
  ];
  const statusStats = createdAuctions.reduce((stats, auction) => {
    stats[auction.status] = (stats[auction.status] || 0) + 1;
    return stats;
  }, {});

  console.log(`Seeded ${process.env.NODE_ENV} database.`);
  console.log(`Created ${createdUsers.length} users, ${createdModerators.length} moderators, ${createdAuctions.length} auctions.`);
  console.table(statusStats);
  console.log('Verification histories include rejected -> approved cases for 5 users.');
  console.log('Auction histories include current returned lots and returned -> approved publication cases.');
  console.table(accounts);
};

seed()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDatabase().catch(() => {});
  });
