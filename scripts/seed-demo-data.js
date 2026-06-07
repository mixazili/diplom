const { spawnSync } = require('child_process');
const fs = require('fs');
const http = require('http');
const https = require('https');
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
const AuctionProtocol = require('../backend/src/models/AuctionProtocol');
const AuctionReview = require('../backend/src/models/AuctionReview');
const Bid = require('../backend/src/models/Bid');
const Chat = require('../backend/src/models/Chat');
const ChatMessage = require('../backend/src/models/ChatMessage');
const Counter = require('../backend/src/models/Counter');
const Deposit = require('../backend/src/models/Deposit');
const Notification = require('../backend/src/models/Notification');
const User = require('../backend/src/models/User');
const VerificationRequest = require('../backend/src/models/VerificationRequest');
const VerificationReview = require('../backend/src/models/VerificationReview');
const { formatAuction } = require('../backend/src/utils/auctionFormatters');
const { ensureAuctionProtocol } = require('../backend/src/services/auctionProtocolService');
const { ensureDealChatForAuction } = require('../backend/src/services/chatService');
const { resetTimeOffset } = require('../backend/src/services/timeService');

const password = 'Demo12345';
const uploadRoot = path.join(process.cwd(), 'backend', 'uploads');
const auctionUploadDir = path.join(uploadRoot, 'auctions');
const verificationUploadDir = path.join(uploadRoot, 'verification');
const currentYear = new Date().getFullYear();
const envName = process.env.NODE_ENV;

const moderators = [
  { email: 'moderator1@auction.by' },
  { email: 'moderator2@auction.by' }
];

const demoUsers = [
  {
    email: 'individual.resident1@auction.by',
    accountType: 'individual',
    isResident: true,
    firstName: 'Иван',
    lastName: 'Петров',
    middleName: 'Сергеевич',
    phone: '375291110001',
    additionalPhone: '375291120001',
    address: 'Минская область, г. Минск, ул. Октябрьская, д. 10, кв. 18',
    country: 'Республика Беларусь'
  },
  {
    email: 'individual.nonresident1@auction.by',
    accountType: 'individual',
    isResident: false,
    firstName: 'Алексей',
    lastName: 'Коваленко',
    middleName: 'Игоревич',
    phone: '375291110002',
    additionalPhone: '375291120002',
    address: 'Российская Федерация, г. Москва, ул. Тверская, д. 7, кв. 21',
    country: 'Российская Федерация'
  },
  {
    email: 'company.resident1@auction.by',
    accountType: 'legal_entity',
    isResident: true,
    shortName: 'ООО "Минск Трейд"',
    fullName: 'Общество с ограниченной ответственностью "Минск Трейд"',
    directorFullName: 'Громов Павел Викторович',
    directorPosition: 'Директор',
    directorBasis: 'charter',
    unp: '193000001',
    phone: '375291110003',
    address: 'Минская область, г. Минск, ул. Кальварийская, д. 17, офис 401',
    country: 'Республика Беларусь'
  },
  {
    email: 'company.nonresident1@auction.by',
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
    email: 'entrepreneur.resident1@auction.by',
    accountType: 'entrepreneur',
    isResident: true,
    firstName: 'Михаил',
    lastName: 'Бас',
    middleName: 'Андреевич',
    unp: '193000005',
    phone: '375291110005',
    additionalPhone: '375291120005',
    address: 'Минская область, г. Минск, ул. Калиновского, д. 79, кв. 8',
    country: 'Республика Беларусь'
  },
  {
    email: 'entrepreneur.nonresident1@auction.by',
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
    email: 'individual.resident2@auction.by',
    accountType: 'individual',
    isResident: true,
    firstName: 'Анна',
    lastName: 'Савицкая',
    middleName: 'Олеговна',
    phone: '375291110007',
    additionalPhone: '375291120007',
    address: 'Гродненская область, г. Гродно, ул. Замковая, д. 4, кв. 12',
    country: 'Республика Беларусь'
  },
  {
    email: 'company.resident2@auction.by',
    accountType: 'legal_entity',
    isResident: true,
    shortName: 'ЗАО "ТехноПарк"',
    fullName: 'Закрытое акционерное общество "ТехноПарк"',
    directorFullName: 'Климов Денис Андреевич',
    directorPosition: 'Генеральный директор',
    directorBasis: 'charter',
    unp: '193000008',
    phone: '375291110008',
    address: 'Витебская область, г. Витебск, ул. Гагарина, д. 31, офис 6',
    country: 'Республика Беларусь'
  },
  {
    email: 'entrepreneur.resident2@auction.by',
    accountType: 'entrepreneur',
    isResident: true,
    firstName: 'Ольга',
    lastName: 'Романова',
    middleName: 'Петровна',
    unp: '193000009',
    phone: '375291110009',
    additionalPhone: '375291120009',
    address: 'Брестская область, г. Брест, ул. Советская, д. 83, кв. 5',
    country: 'Республика Беларусь'
  },
  {
    email: 'individual.nonresident2@auction.by',
    accountType: 'individual',
    isResident: false,
    firstName: 'Марина',
    lastName: 'Волкова',
    middleName: 'Александровна',
    phone: '375291110010',
    additionalPhone: '375291120010',
    address: 'Республика Казахстан, г. Алматы, пр-т Абая, д. 25, кв. 44',
    country: 'Республика Казахстан'
  },
  {
    email: 'individual.resident3@auction.by',
    accountType: 'individual',
    isResident: true,
    firstName: 'Денис',
    lastName: 'Орлов',
    middleName: 'Викторович',
    phone: '375291110011',
    additionalPhone: '375291120011',
    address: 'Гомельская область, г. Гомель, ул. Советская, д. 41, кв. 9',
    country: 'Республика Беларусь'
  },
  {
    email: 'individual.resident4@auction.by',
    accountType: 'individual',
    isResident: true,
    firstName: 'Елена',
    lastName: 'Кравцова',
    middleName: 'Николаевна',
    phone: '375291110012',
    additionalPhone: '375291120012',
    address: 'Могилевская область, г. Могилев, ул. Первомайская, д. 63, кв. 22',
    country: 'Республика Беларусь'
  },
  {
    email: 'company.resident3@auction.by',
    accountType: 'legal_entity',
    isResident: true,
    shortName: 'ООО "Гродно Логистик"',
    fullName: 'Общество с ограниченной ответственностью "Гродно Логистик"',
    directorFullName: 'Поляков Артем Игоревич',
    directorPosition: 'Директор',
    directorBasis: 'charter',
    unp: '193000013',
    phone: '375291110013',
    address: 'Гродненская область, г. Лида, ул. Транспортная, д. 8',
    country: 'Республика Беларусь'
  },
  {
    email: 'company.nonresident2@auction.by',
    accountType: 'legal_entity',
    isResident: false,
    shortName: 'Nord Machinery OU',
    fullName: 'Nord Machinery OU',
    directorFullName: 'Marten Saar',
    directorPosition: 'Director',
    directorBasis: 'power_of_attorney',
    chiefAccountantFullName: 'Kaisa Tamm',
    chiefAccountantPhone: '375291120014',
    taxId: 'EE100000014',
    phone: '375291110014',
    address: 'Эстония, г. Таллин, ул. Тёэстузе, д. 14',
    country: 'Эстония'
  },
  {
    email: 'entrepreneur.resident3@auction.by',
    accountType: 'entrepreneur',
    isResident: true,
    firstName: 'Сергей',
    lastName: 'Василевский',
    middleName: 'Павлович',
    unp: '193000015',
    phone: '375291110015',
    additionalPhone: '375291120015',
    address: 'Минская область, г. Молодечно, ул. Великий Гостинец, д. 19',
    country: 'Республика Беларусь'
  },
  {
    email: 'entrepreneur.nonresident2@auction.by',
    accountType: 'entrepreneur',
    isResident: false,
    firstName: 'Илья',
    lastName: 'Соколов',
    middleName: 'Дмитриевич',
    taxId: 'RU770000000016',
    phone: '375291110016',
    additionalPhone: '375291120016',
    address: 'Российская Федерация, г. Смоленск, ул. Николаева, д. 12',
    country: 'Российская Федерация'
  },
  {
    email: 'individual.resident5@auction.by',
    accountType: 'individual',
    isResident: true,
    firstName: 'Татьяна',
    lastName: 'Мельникова',
    middleName: 'Ивановна',
    phone: '375291110017',
    additionalPhone: '375291120017',
    address: 'Витебская область, г. Орша, ул. Ленина, д. 22, кв. 17',
    country: 'Республика Беларусь'
  },
  {
    email: 'company.resident4@auction.by',
    accountType: 'legal_entity',
    isResident: true,
    shortName: 'ООО "БелФерма"',
    fullName: 'Общество с ограниченной ответственностью "БелФерма"',
    directorFullName: 'Руденко Кирилл Андреевич',
    directorPosition: 'Директор',
    directorBasis: 'charter',
    unp: '193000018',
    phone: '375291110018',
    address: 'Минская область, г. Слуцк, ул. Сельская, д. 5',
    country: 'Республика Беларусь'
  },
  {
    email: 'entrepreneur.resident4@auction.by',
    accountType: 'entrepreneur',
    isResident: true,
    firstName: 'Виктор',
    lastName: 'Николаев',
    middleName: 'Петрович',
    unp: '193000019',
    phone: '375291110019',
    additionalPhone: '375291120019',
    address: 'Гомельская область, г. Мозырь, ул. Интернациональная, д. 31',
    country: 'Республика Беларусь'
  },
  {
    email: 'individual.nonresident3@auction.by',
    accountType: 'individual',
    isResident: false,
    firstName: 'Андрей',
    lastName: 'Литвинов',
    middleName: 'Романович',
    phone: '375291110020',
    additionalPhone: '375291120020',
    address: 'Литва, г. Вильнюс, пр-т Гедимина, д. 9',
    country: 'Литва'
  }
];

const itemTemplates = [
  {
    category: 'passenger_cars',
    title: 'Volkswagen Passat B8 2019',
    address: 'Минская область, г. Минск, ул. Машиностроителей, д. 12',
    region: 'Минская область',
    city: 'Минск',
    geoLocation: { lat: 53.8621, lng: 27.6496 },
    imageQuery: 'volkswagen,passat,car',
    characteristics: [['Год выпуска', '2019'], ['Марка и модель', 'Volkswagen Passat B8'], ['Тип двигателя', 'дизель'], ['Пробег', '124 000 км'], ['Состояние', 'хорошее']]
  },
  {
    category: 'trucks',
    title: 'MAN TGS 26.440 с полуприцепом',
    address: 'Минская область, г. Смолевичи, ул. Промышленная, д. 9',
    region: 'Минская область',
    city: 'Смолевичи',
    geoLocation: { lat: 54.0242, lng: 28.0865 },
    imageQuery: 'truck,man,semi',
    characteristics: [['Год выпуска', '2016'], ['Марка и модель', 'MAN TGS 26.440'], ['Грузоподъемность', '18 т'], ['Пробег', '410 000 км'], ['Состояние', 'рабочее']]
  },
  {
    category: 'electronics',
    title: 'Комплект серверного оборудования Dell PowerEdge',
    address: 'Минская область, г. Минск, пр-т Независимости, д. 117А',
    region: 'Минская область',
    city: 'Минск',
    geoLocation: { lat: 53.9344, lng: 27.6511 },
    imageQuery: 'server,rack,data,center',
    characteristics: [['Тип устройства', 'серверное оборудование'], ['Бренд', 'Dell'], ['Модель', 'PowerEdge R740'], ['Комплектация', 'стойка, ИБП, коммутатор'], ['Состояние', 'рабочее']]
  },
  {
    category: 'commercial_real_estate',
    title: 'Складское помещение 420 м2',
    address: 'Минская область, г. Дзержинск, ул. Промышленная, д. 4',
    region: 'Минская область',
    city: 'Дзержинск',
    geoLocation: { lat: 53.6824, lng: 27.1351 },
    imageQuery: 'warehouse,industrial,building',
    characteristics: [['Тип объекта', 'склад'], ['Общая площадь', '420 м2'], ['Назначение помещений', 'хранение товаров'], ['Коммуникации', 'электричество, отопление'], ['Состояние', 'удовлетворительное']]
  },
  {
    category: 'machines_equipment',
    title: 'Токарный станок 16К20',
    address: 'Гомельская область, г. Гомель, ул. Барыкина, д. 301',
    region: 'Гомельская область',
    city: 'Гомель',
    geoLocation: { lat: 52.4177, lng: 31.0159 },
    imageQuery: 'lathe,machine,industrial',
    characteristics: [['Наименование оборудования', 'токарный станок'], ['Производитель', 'Красный пролетарий'], ['Модель', '16К20'], ['Год выпуска', '1991'], ['Техническое состояние', 'требует обслуживания']]
  },
  {
    category: 'jewelry',
    title: 'Золотые часы с бриллиантами',
    address: 'Брестская область, г. Брест, ул. Советская, д. 83',
    region: 'Брестская область',
    city: 'Брест',
    geoLocation: { lat: 52.0976, lng: 23.7341 },
    imageQuery: 'luxury,watch,jewelry',
    characteristics: [['Тип изделия', 'часы'], ['Материал', 'золото 585'], ['Вес', '84 г'], ['Камни или вставки', 'бриллианты'], ['Состояние', 'отличное']]
  },
  {
    category: 'art',
    title: 'Картина белорусского художника',
    address: 'Гродненская область, г. Гродно, ул. Замковая, д. 4',
    region: 'Гродненская область',
    city: 'Гродно',
    geoLocation: { lat: 53.6778, lng: 23.8295 },
    imageQuery: 'oil,painting,art',
    characteristics: [['Автор', 'А. Николаев'], ['Название работы', 'Весенний двор'], ['Год создания', '1987'], ['Техника', 'холст, масло'], ['Состояние', 'хорошее']]
  },
  {
    category: 'books',
    title: 'Коллекция редких книг по истории Беларуси',
    address: 'Витебская область, г. Витебск, ул. Суворова, д. 18',
    region: 'Витебская область',
    city: 'Витебск',
    geoLocation: { lat: 55.1904, lng: 30.2049 },
    imageQuery: 'rare,books,library',
    characteristics: [['Количество', '42 экземпляра'], ['Тематика', 'история Беларуси'], ['Период', '1905-1978'], ['Язык', 'русский, белорусский'], ['Состояние', 'разное']]
  },
  {
    category: 'clothing',
    title: 'Партия новой спецодежды',
    address: 'Могилевская область, г. Могилев, ул. Первомайская, д. 63',
    region: 'Могилевская область',
    city: 'Могилев',
    geoLocation: { lat: 53.8945, lng: 30.3307 },
    imageQuery: 'workwear,uniform,clothing',
    characteristics: [['Тип изделия', 'спецодежда'], ['Количество', '180 комплектов'], ['Размер', '48-56'], ['Материал', 'смесовая ткань'], ['Состояние', 'новое']]
  },
  {
    category: 'furniture',
    title: 'Офисная мебель комплектом',
    address: 'Минская область, г. Минск, ул. Куйбышева, д. 22',
    region: 'Минская область',
    city: 'Минск',
    geoLocation: { lat: 53.9187, lng: 27.5748 },
    imageQuery: 'office,furniture,desk',
    characteristics: [['Тип мебели', 'офисная мебель'], ['Количество предметов', '36'], ['Материал', 'ЛДСП, металл'], ['Комплектность', 'столы, шкафы, тумбы'], ['Состояние', 'хорошее']]
  },
  {
    category: 'agricultural_equipment',
    title: 'Трактор Беларус 82.1',
    address: 'Минская область, г. Слуцк, ул. Сельская, д. 5',
    region: 'Минская область',
    city: 'Слуцк',
    geoLocation: { lat: 53.0215, lng: 27.5523 },
    imageQuery: 'tractor,farm,agriculture',
    characteristics: [['Тип техники', 'трактор'], ['Марка и модель', 'Беларус 82.1'], ['Год выпуска', '2017'], ['Наработка', '3 200 моточасов'], ['Состояние', 'рабочее']]
  },
  {
    category: 'phones',
    title: 'Партия смартфонов Samsung Galaxy',
    address: 'Минская область, г. Минск, ул. Притыцкого, д. 29',
    region: 'Минская область',
    city: 'Минск',
    geoLocation: { lat: 53.9087, lng: 27.4818 },
    imageQuery: 'smartphones,samsung,phones',
    characteristics: [['Тип устройства', 'смартфоны'], ['Бренд', 'Samsung'], ['Модель', 'Galaxy A-series'], ['Количество', '24'], ['Состояние', 'новое']]
  },
  {
    category: 'computers',
    title: 'Ноутбуки Lenovo ThinkPad',
    address: 'Гродненская область, г. Лида, ул. Транспортная, д. 8',
    region: 'Гродненская область',
    city: 'Лида',
    geoLocation: { lat: 53.8833, lng: 25.2997 },
    imageQuery: 'laptop,thinkpad,computer',
    characteristics: [['Тип устройства', 'ноутбук'], ['Производитель', 'Lenovo'], ['Модель', 'ThinkPad T14'], ['Оперативная память', '16 ГБ'], ['Состояние', 'хорошее']]
  },
  {
    category: 'warehouse_equipment',
    title: 'Электрический погрузчик Still RX 20',
    address: 'Брестская область, г. Барановичи, ул. Промышленная, д. 11',
    region: 'Брестская область',
    city: 'Барановичи',
    geoLocation: { lat: 53.1327, lng: 26.0139 },
    imageQuery: 'forklift,warehouse',
    characteristics: [['Тип оборудования', 'электропогрузчик'], ['Производитель', 'Still'], ['Модель', 'RX 20'], ['Грузоподъемность', '2 т'], ['Состояние', 'рабочее']]
  },
  {
    category: 'medical_equipment',
    title: 'УЗИ аппарат Mindray DC-40',
    address: 'Витебская область, г. Витебск, пр-т Фрунзе, д. 54',
    region: 'Витебская область',
    city: 'Витебск',
    geoLocation: { lat: 55.1899, lng: 30.2172 },
    imageQuery: 'ultrasound,medical,equipment',
    characteristics: [['Тип оборудования', 'УЗИ аппарат'], ['Производитель', 'Mindray'], ['Модель', 'DC-40'], ['Год выпуска', '2018'], ['Состояние', 'рабочее']]
  },
  {
    category: 'home_appliances',
    title: 'Комплект бытовой техники Bosch',
    address: 'Гомельская область, г. Мозырь, ул. Интернациональная, д. 31',
    region: 'Гомельская область',
    city: 'Мозырь',
    geoLocation: { lat: 52.0495, lng: 29.2456 },
    imageQuery: 'home,appliances,kitchen',
    characteristics: [['Тип техники', 'кухонная техника'], ['Бренд', 'Bosch'], ['Количество', '8 единиц'], ['Комплектация', 'духовой шкаф, варочная панель, вытяжка'], ['Состояние', 'новое']]
  },
  {
    category: 'coins',
    title: 'Коллекция памятных монет',
    address: 'Минская область, г. Минск, ул. Раковская, д. 12',
    region: 'Минская область',
    city: 'Минск',
    geoLocation: { lat: 53.9027, lng: 27.5486 },
    imageQuery: 'coin,collection,numismatic',
    characteristics: [['Тип предмета', 'памятные монеты'], ['Страна', 'Беларусь'], ['Период', '1996-2020'], ['Количество', '68'], ['Сохранность', 'отличная']]
  },
  {
    category: 'watches',
    title: 'Наручные часы Longines',
    address: 'Минская область, г. Минск, ул. Немига, д. 5',
    region: 'Минская область',
    city: 'Минск',
    geoLocation: { lat: 53.9046, lng: 27.5521 },
    imageQuery: 'longines,watch,luxury',
    characteristics: [['Тип часов', 'наручные'], ['Бренд', 'Longines'], ['Механизм', 'автоматический'], ['Материал корпуса', 'сталь'], ['Состояние', 'отличное']]
  },
  {
    category: 'construction_equipment',
    title: 'Бетономешалка промышленная Sicoma',
    address: 'Минская область, г. Борисов, ул. Заводская, д. 15',
    region: 'Минская область',
    city: 'Борисов',
    geoLocation: { lat: 54.2279, lng: 28.5050 },
    imageQuery: 'concrete,mixer,construction',
    characteristics: [['Тип оборудования', 'бетономешалка'], ['Марка и модель', 'Sicoma MAO'], ['Год выпуска', '2015'], ['Производительность', '60 м3/ч'], ['Состояние', 'рабочее']]
  },
  {
    category: 'land_plots',
    title: 'Земельный участок под склад',
    address: 'Минская область, г. Фаниполь, ул. Зеленая, д. 3',
    region: 'Минская область',
    city: 'Фаниполь',
    geoLocation: { lat: 53.7516, lng: 27.3368 },
    imageQuery: 'land,plot,field',
    characteristics: [['Площадь участка', '0,84 га'], ['Целевое назначение', 'производственно-складское'], ['Коммуникации', 'рядом'], ['Подъездные пути', 'асфальт'], ['Состояние', 'свободен']]
  },
  {
    category: 'buses',
    title: 'Автобус МАЗ 256',
    address: 'Могилевская область, г. Бобруйск, ул. Минская, д. 101',
    region: 'Могилевская область',
    city: 'Бобруйск',
    geoLocation: { lat: 53.1384, lng: 29.2214 },
    imageQuery: 'bus,maz,vehicle',
    characteristics: [['Год выпуска', '2014'], ['Марка и модель', 'МАЗ 256'], ['Количество мест', '28'], ['Пробег', '350 000 км'], ['Состояние', 'рабочее']]
  },
  {
    category: 'motorcycles',
    title: 'Мотоцикл Yamaha MT-07',
    address: 'Минская область, г. Минск, ул. Тимирязева, д. 67',
    region: 'Минская область',
    city: 'Минск',
    geoLocation: { lat: 53.9250, lng: 27.5155 },
    imageQuery: 'yamaha,motorcycle',
    characteristics: [['Год выпуска', '2020'], ['Марка и модель', 'Yamaha MT-07'], ['Объем двигателя в см3', '689'], ['Пробег', '12 500 км'], ['Состояние', 'хорошее']]
  },
  {
    category: 'food_equipment',
    title: 'Печь конвекционная Unox',
    address: 'Брестская область, г. Пинск, ул. Центральная, д. 14',
    region: 'Брестская область',
    city: 'Пинск',
    geoLocation: { lat: 52.1153, lng: 26.1031 },
    imageQuery: 'commercial,oven,kitchen',
    characteristics: [['Тип оборудования', 'конвекционная печь'], ['Производитель', 'Unox'], ['Модель', 'XEBC'], ['Год выпуска', '2019'], ['Состояние', 'рабочее']]
  },
  {
    category: 'sports',
    title: 'Комплект тренажеров Life Fitness',
    address: 'Минская область, г. Минск, пр-т Победителей, д. 89',
    region: 'Минская область',
    city: 'Минск',
    geoLocation: { lat: 53.9368, lng: 27.4815 },
    imageQuery: 'gym,equipment,fitness',
    characteristics: [['Вид товара', 'тренажеры'], ['Бренд', 'Life Fitness'], ['Количество', '12'], ['Комплектность', 'полная'], ['Состояние', 'хорошее']]
  },
  {
    category: 'building_materials',
    title: 'Кирпич керамический облицовочный',
    address: 'Гомельская область, г. Речица, ул. Строителей, д. 6',
    region: 'Гомельская область',
    city: 'Речица',
    geoLocation: { lat: 52.3638, lng: 30.3947 },
    imageQuery: 'bricks,construction,material',
    characteristics: [['Тип материалов', 'кирпич облицовочный'], ['Количество', '18 000 шт.'], ['Марка', 'М150'], ['Упаковка', 'поддоны'], ['Состояние', 'новое']]
  },
  {
    category: 'livestock',
    title: 'Племенные телки голштинской породы',
    address: 'Минская область, г. Несвиж, ул. Полевая, д. 2',
    region: 'Минская область',
    city: 'Несвиж',
    geoLocation: { lat: 53.2226, lng: 26.6726 },
    imageQuery: 'cows,farm,livestock',
    characteristics: [['Вид животных', 'крупный рогатый скот'], ['Порода', 'голштинская'], ['Количество', '15'], ['Возраст', '14-18 месяцев'], ['Состояние', 'здоровые']]
  },
  {
    category: 'farm_products',
    title: 'Партия зерна пшеницы 3 класса',
    address: 'Могилевская область, г. Горки, ул. Элеваторная, д. 1',
    region: 'Могилевская область',
    city: 'Горки',
    geoLocation: { lat: 54.2862, lng: 30.9865 },
    imageQuery: 'wheat,grain,agriculture',
    characteristics: [['Вид продукции', 'пшеница'], ['Количество', '120 т'], ['Год урожая или производства', '2025'], ['Условия хранения', 'элеватор'], ['Качество', '3 класс']]
  },
  {
    category: 'musical_instruments',
    title: 'Рояль Petrof концертный',
    address: 'Минская область, г. Минск, ул. Интернациональная, д. 7',
    region: 'Минская область',
    city: 'Минск',
    geoLocation: { lat: 53.9041, lng: 27.5590 },
    imageQuery: 'grand,piano,concert',
    characteristics: [['Тип инструмента', 'рояль'], ['Производитель', 'Petrof'], ['Модель', 'Concert Grand'], ['Год выпуска', '1984'], ['Состояние', 'после настройки']]
  },
  {
    category: 'business_inventory',
    title: 'Товарные остатки магазина электроники',
    address: 'Витебская область, г. Полоцк, ул. Евфросиньи Полоцкой, д. 21',
    region: 'Витебская область',
    city: 'Полоцк',
    geoLocation: { lat: 55.4856, lng: 28.7680 },
    imageQuery: 'electronics,inventory,store',
    characteristics: [['Тип остатков', 'электроника'], ['Количество позиций', '146'], ['Упаковка', 'частично заводская'], ['Срок годности', 'не применяется'], ['Состояние', 'новое и витринное']]
  },
  {
    category: 'scrap',
    title: 'Лом черных металлов',
    address: 'Гомельская область, г. Жлобин, ул. Металлургов, д. 10',
    region: 'Гомельская область',
    city: 'Жлобин',
    geoLocation: { lat: 52.8927, lng: 30.0240 },
    imageQuery: 'scrap,metal,industrial',
    characteristics: [['Тип сырья', 'лом черных металлов'], ['Материал', 'сталь'], ['Количество', '32 т'], ['Фракция', 'смешанная'], ['Условия вывоза', 'самовывоз']]
  },
  {
    category: 'other_property',
    title: 'Комплект выставочного оборудования',
    address: 'Минская область, г. Минск, ул. Сурганова, д. 57Б',
    region: 'Минская область',
    city: 'Минск',
    geoLocation: { lat: 53.9273, lng: 27.5896 },
    imageQuery: 'exhibition,booth,equipment',
    characteristics: [['Наименование', 'выставочное оборудование'], ['Количество', '1 комплект'], ['Комплектность', 'стенды, свет, ресепшен'], ['Год выпуска', '2021'], ['Состояние', 'хорошее']]
  },
  {
    category: 'antiques',
    title: 'Антикварный шкаф из массива дуба',
    address: 'Гродненская область, г. Новогрудок, ул. Мицкевича, д. 16',
    region: 'Гродненская область',
    city: 'Новогрудок',
    geoLocation: { lat: 53.5965, lng: 25.8244 },
    imageQuery: 'antique,cabinet,furniture',
    characteristics: [['Предмет', 'шкаф'], ['Период', 'начало XX века'], ['Страна происхождения', 'Польша'], ['Материал', 'дуб'], ['Состояние', 'хорошее']]
  },
  {
    category: 'apartments',
    title: 'Квартира 2-комнатная в центре',
    address: 'Минская область, г. Минск, ул. Кирова, д. 3',
    region: 'Минская область',
    city: 'Минск',
    geoLocation: { lat: 53.8919, lng: 27.5512 },
    imageQuery: 'apartment,interior,real,estate',
    characteristics: [['Общая площадь', '54,2 м2'], ['Жилая площадь', '31,8 м2'], ['Количество комнат', '2'], ['Этаж', '4'], ['Состояние', 'жилое']]
  }
];

const statusPattern = [
  'draft',
  'pending',
  'returned',
  'application_waiting',
  'applications_open',
  'bidding_waiting',
  'bidding_active',
  'finished_success',
  'finished_failed',
  'cancelled',
  'applications_open',
  'finished_success',
  'application_waiting',
  'bidding_active',
  'finished_failed'
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

const downloadFile = (url, filePath, redirectsLeft = 4) =>
  new Promise((resolve, reject) => {
    const client = url.startsWith('https:') ? https : http;
    let request = null;
    const timeoutId = setTimeout(() => {
      request?.destroy(new Error('Image download timeout'));
    }, 5000);
    let settled = false;
    const finish = (callback, value) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timeoutId);
      callback(value);
    };
    request = client.get(url, { timeout: 5000 }, (response) => {
      if ([301, 302, 303, 307, 308].includes(response.statusCode) && response.headers.location && redirectsLeft > 0) {
        response.resume();
        const nextUrl = new URL(response.headers.location, url).toString();
        downloadFile(nextUrl, filePath, redirectsLeft - 1).then((value) => finish(resolve, value)).catch((error) => finish(reject, error));
        return;
      }

      if (response.statusCode !== 200) {
        response.resume();
        finish(reject, new Error(`Image download failed: ${response.statusCode}`));
        return;
      }

      const stream = fs.createWriteStream(filePath);
      response.pipe(stream);
      stream.on('finish', () => {
        stream.close(() => finish(resolve));
      });
      stream.on('error', (error) => finish(reject, error));
    });

    request.on('timeout', () => {
      request.destroy(new Error('Image download timeout'));
    });
    request.on('error', (error) => finish(reject, error));
  });

const ensurePhotoFile = async ({ template, templateIndex, photoIndex }) => {
  const lock = 1000 + templateIndex;
  const safeKey = `${template.category}-${templateIndex}`;
  const fileName = `${envName}-auction-photo-${safeKey}.jpg`;
  const filePath = path.join(auctionUploadDir, fileName);

  if (fs.existsSync(filePath) && fs.statSync(filePath).size > 0) {
    return {
      fieldName: 'photos',
      originalName: fileName,
      mimeType: 'image/jpeg',
      size: fs.statSync(filePath).size,
      path: filePath
    };
  }

  const url = `https://loremflickr.com/1200/800/${encodeURIComponent(template.imageQuery)}?lock=${lock}`;
  try {
    await downloadFile(url, filePath);
    return {
      fieldName: 'photos',
      originalName: fileName,
      mimeType: 'image/jpeg',
      size: fs.statSync(filePath).size,
      path: filePath
    };
  } catch (error) {
    console.warn(`Using SVG fallback for ${template.title}: ${error.message}`);
    const fallback = writeSvg({
      dir: auctionUploadDir,
      fileName: fileName.replace('.jpg', '.svg'),
      title: template.title,
      subtitle: template.category,
      color: ['#991b1b', '#1d4ed8', '#047857', '#92400e', '#6d28d9'][templateIndex % 5]
    });
    return { ...fallback, fieldName: 'photos' };
  }
};

const photoCache = new Map();

const makeAuctionPhotos = async ({ template, templateIndex }) => {
  const count = 3;
  const photos = [];
  const cacheKey = `${templateIndex}:main`;

  if (!photoCache.has(cacheKey)) {
    photoCache.set(cacheKey, await ensurePhotoFile({ template, templateIndex, photoIndex: 0 }));
  }

  for (let photoIndex = 0; photoIndex < count; photoIndex += 1) {
    const file = photoCache.get(cacheKey);
    photos.push({
      ...file,
      fieldName: 'photos',
      isMain: photoIndex === 0,
      order: photoIndex
    });
  }

  return photos;
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
  const base = `${envName}-verification-${index}-${suffix}`;
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

const scheduleForStatus = (status, sequence) => {
  const shift = sequence % 3;

  if (status === 'application_waiting') {
    return {
      applicationStartAt: makeDate(1 + shift, 9),
      applicationEndAt: makeDate(5 + shift, 19),
      biddingStartAt: makeDate(6 + shift, 10 + (sequence % 6)),
      biddingEndAt: makeDate(6 + shift, 15 + (sequence % 4))
    };
  }

  if (status === 'applications_open') {
    return {
      applicationStartAt: makeDate(-1 - shift, 9),
      applicationEndAt: makeDate(1 + shift, 19),
      biddingStartAt: makeDate(2 + shift, 10 + (sequence % 6)),
      biddingEndAt: makeDate(2 + shift, 15 + (sequence % 4))
    };
  }

  if (status === 'bidding_waiting') {
    return {
      applicationStartAt: makeDate(-6 - shift, 9),
      applicationEndAt: makeDate(-1, 19),
      biddingStartAt: makeDate(0, 12 + (sequence % 5)),
      biddingEndAt: makeDate(0, 16 + (sequence % 3))
    };
  }

  if (status === 'bidding_active') {
    return {
      applicationStartAt: makeDate(-7 - shift, 9),
      applicationEndAt: makeDate(-2, 19),
      biddingStartAt: makeDate(0, 9),
      biddingEndAt: makeDate(0, 18 + (sequence % 2))
    };
  }

  if (['finished_success', 'finished_failed'].includes(status)) {
    return {
      applicationStartAt: makeDate(-16 - shift, 9),
      applicationEndAt: makeDate(-12 - shift, 19),
      biddingStartAt: makeDate(-11 - shift, 10),
      biddingEndAt: makeDate(-11 - shift, 16)
    };
  }

  if (status === 'cancelled') {
    return {
      applicationStartAt: makeDate(-3, 9),
      applicationEndAt: makeDate(2, 19),
      biddingStartAt: makeDate(3, 12),
      biddingEndAt: makeDate(3, 17)
    };
  }

  return {
    applicationStartAt: makeDate(1 + shift, 9),
    applicationEndAt: makeDate(5 + shift, 19),
    biddingStartAt: makeDate(6 + shift, 10),
    biddingEndAt: makeDate(6 + shift, 16)
  };
};

const buildAuction = async ({ owner, ownerSeed, ownerIndex, auctionIndex, verificationData, status, auctionNumber = null, previousRejection = false, sequence }) => {
  const templateIndex = (ownerIndex * 7 + auctionIndex) % itemTemplates.length;
  const template = itemTemplates[templateIndex];
  const vatApplies = ['legal_entity', 'entrepreneur'].includes(ownerSeed.accountType);
  const priceWithVat = Math.round(1200 + templateIndex * 1450 + ownerIndex * 700 + auctionIndex * 370);
  const auctionType = auctionIndex % 2 === 0 ? 'increase' : 'decrease';
  const minPriceWithVat = auctionType === 'decrease' ? Math.round(priceWithVat * (0.68 + (auctionIndex % 5) * 0.03)) : null;
  const bidStepsCount = auctionType === 'decrease' ? 8 + (auctionIndex % 12) : null;
  const title = `${template.title} ${ownerIndex + 1}.${auctionIndex + 1}`;
  const schedule = scheduleForStatus(status, sequence);

  return {
    owner: owner._id,
    auctionNumber,
    viewsCount: ['application_waiting', 'applications_open', 'bidding_waiting', 'bidding_active', 'finished_success', 'finished_failed'].includes(status)
      ? 12 + ((ownerIndex + 1) * (auctionIndex + 3)) % 900
      : 0,
    status,
    moderationComment: status === 'returned' ? 'Причина отклонения: требуется уточнить описание лота, условия осмотра и добавить более качественные фотографии.' : '',
    resultReason: status === 'cancelled' ? 'Аукцион отменен модератором по обращению продавца.' : null,
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
      ...schedule,
      paymentDeadlineDays: 10 + (auctionIndex % 20),
      contractDeadlineDays: 12 + (auctionIndex % 20)
    },
    item: {
      title,
      category: template.category,
      characteristics: template.characteristics.map(([name, value]) => ({ name, value })),
      description: `Реалистичный демонстрационный аукцион для проверки каталога, карточек, модерации, торгов и протоколов. Лот находится по адресу: ${template.address}. ${previousRejection ? 'Заявка ранее возвращалась на доработку, после уточнения данных была отправлена повторно.' : 'Описание заполнено на основании данных продавца.'}`,
      locationAddress: template.address,
      locationRegion: template.region,
      locationCity: template.city,
      geoLocation: template.geoLocation
    },
    photos: await makeAuctionPhotos({ template, templateIndex }),
    inspection: {
      contactName: verificationData.personalData.fullName || verificationData.organizationData.directorFullName,
      contactPhone: ownerSeed.phone,
      contactEmail: verificationData.personalData.notificationEmail
    },
    seller: sellerFromVerification(ownerSeed, verificationData),
    submittedAt: ['draft', 'cancelled'].includes(status) ? null : makeDate(-2, 12),
    reviewedBy: null,
    reviewedAt: null
  };
};

const cleanupDatabase = async () => {
  await ChatMessage.deleteMany({});
  await Chat.deleteMany({});
  await Notification.deleteMany({});
  await AuctionProtocol.deleteMany({});
  await AuctionApplication.deleteMany({});
  await Bid.deleteMany({});
  await Deposit.deleteMany({});
  await AuctionReview.deleteMany({});
  await Auction.deleteMany({});
  await VerificationReview.deleteMany({});
  await VerificationRequest.deleteMany({});
  await Counter.deleteMany({});
  await User.deleteMany({ role: { $ne: 'admin' } });
  await User.updateMany({ role: 'admin' }, { $set: { favoriteAuctions: [] } });
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
    submittedAt: makeDate(-30 + userIndex, 10),
    moderationComment: 'Причина отказа: не заполнены обязательные данные и требуется повторно загрузить документы.',
    reviewedBy: moderator._id,
    reviewedAt: makeDate(-29 + userIndex, 16)
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
    submittedAt: makeDate(-22 + Math.min(userIndex, 18), 11),
    reviewedBy: moderator._id,
    reviewedAt: makeDate(-21 + Math.min(userIndex, 18), 14)
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
    auctionNumber: action === 'approved' ? null : auction.auctionNumber,
    moderationComment: action === 'returned' ? comment : auction.moderationComment,
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

const createNotification = async ({ user, type, title, body, importance = 'important', auction }) => {
  await Notification.create({
    user: user._id || user,
    type,
    title,
    body,
    importance,
    link: auction ? `/auction/${auction._id}` : '',
    entity: auction ? { kind: 'auction', id: auction._id } : { kind: '', id: null },
    readAt: importance === 'normal' ? makeDate(-1, 11) : null
  });
};

const seedParticipation = async ({ auction, users, index }) => {
  if (!['applications_open', 'bidding_waiting', 'bidding_active', 'finished_success', 'finished_failed'].includes(auction.status)) {
    return;
  }

  const participantCount = auction.status === 'applications_open' ? 4 : 5;
  const participants = [];
  let cursor = index + 1;
  while (participants.length < participantCount && cursor < index + users.length * 2) {
    const candidate = users[cursor % users.length].user;
    if (candidate._id.toString() !== auction.owner.toString() && !participants.some((participant) => participant._id.toString() === candidate._id.toString())) {
      participants.push(candidate);
    }
    cursor += 1;
  }

  const isDecrease = auction.pricing.auctionType === 'decrease';
  let lastBid = auction.pricing.priceWithVat;
  let winnerApplication = null;
  let winnerBid = null;

  for (let participantIndex = 0; participantIndex < participants.length; participantIndex += 1) {
    const participant = participants[participantIndex];
    const needsDeposit = auction.status === 'applications_open' && participantIndex === 0;
    const applicationStatus = needsDeposit ? 'deposit_required' : 'approved';
    const participantNumber = applicationStatus === 'approved'
      ? 10000000 + index * 100 + participantIndex + 1
      : null;

    const application = await AuctionApplication.create({
      auction: auction._id,
      participant: participant._id,
      status: applicationStatus,
      participantNumber,
      lotPaymentStatus: 'not_required'
    });

    await Deposit.create({
      auction: auction._id,
      payer: participant._id,
      amount: auction.pricing.depositAmount,
      status: applicationStatus === 'deposit_required' ? 'pending' : auction.status === 'finished_success' && participantIndex > 0 ? 'refunded' : 'paid',
      paidAt: applicationStatus === 'deposit_required' ? null : makeDate(-1, 13)
    });

    if (applicationStatus === 'deposit_required') {
      await createNotification({
        user: participant,
        type: 'deposit_required',
        title: 'Необходимо оплатить задаток',
        body: `Для участия в аукционе "${auction.item.title}" оплатите задаток до окончания приема заявок.`,
        auction
      });
      continue;
    }

    await createNotification({
      user: participant,
      type: 'participation_approved',
      title: 'Участие в торгах одобрено',
      body: `Вы допущены к торгам по аукциону "${auction.item.title}". Ваш номер участника: ${participantNumber}.`,
      importance: 'normal',
      auction
    });

    if (['bidding_active', 'finished_success'].includes(auction.status)) {
      const step = auction.pricing.minBidStep || auction.pricing.calculatedBidStep || 100;
      const amount = isDecrease
        ? Math.max(auction.pricing.minPriceWithVat || auction.pricing.priceWithVat, auction.pricing.priceWithVat - step * (participantIndex + 2))
        : auction.pricing.priceWithVat + step * (participantIndex + 1);
      const bid = await Bid.create({
        auction: auction._id,
        bidder: participant._id,
        participantNumber,
        amount,
        increment: isDecrease ? 0 : amount - lastBid,
        createdAt: auction.status === 'finished_success'
          ? makeDate(-11 - (index % 3), 10 + participantIndex, participantIndex * 7)
          : makeDate(0, 9 + participantIndex, participantIndex * 11)
      });
      lastBid = amount;
      winnerApplication = application;
      winnerBid = bid;
    }
  }

  if (auction.status === 'finished_success' && winnerApplication && winnerBid) {
    winnerApplication.lotPaymentStatus = index % 2 === 0 ? 'paid' : 'pending';
    winnerApplication.lotPaidAt = winnerApplication.lotPaymentStatus === 'paid' ? makeDate(-8, 12) : null;
    await winnerApplication.save();

    auction.winner = winnerApplication.participant;
    auction.winnerParticipantNumber = winnerApplication.participantNumber;
    auction.winningBidAmount = winnerBid.amount;
    auction.winningBidAt = winnerBid.createdAt;
    auction.schedule.biddingEndAt = isDecrease ? winnerBid.createdAt : auction.schedule.biddingEndAt;
    await auction.save();

    await Deposit.updateOne(
      { auction: auction._id, payer: winnerApplication.participant },
      { $set: { status: 'paid' } }
    );

    await createNotification({
      user: winnerApplication.participant,
      type: 'auction_won',
      title: 'Вы победили в торгах',
      body: `Вы победили в аукционе "${auction.item.title}". Перейдите к оплате лота.`,
      importance: 'critical',
      auction
    });

    await ensureAuctionProtocol(auction);
    await ensureDealChatForAuction(auction);
  }

  if (auction.status === 'finished_failed') {
    auction.resultReason = index % 2 === 0 ? 'За время торгов не было сделано ни одной ставки' : 'Отсутствуют допущенные участники';
    await auction.save();
    await ensureAuctionProtocol(auction);
  }
};

const seedChatMessages = async () => {
  const chats = await Chat.find({}).populate('seller buyer auction');

  for (const chat of chats) {
    const messages = [
      {
        chat: chat._id,
        sender: chat.seller._id,
        text: `Здравствуйте. Готов обсудить передачу лота "${chat.auction.item.title}" после оплаты.`,
        readBy: [{ user: chat.seller._id, readAt: makeDate(-3, 11) }, { user: chat.buyer._id, readAt: makeDate(-3, 12) }],
        createdAt: makeDate(-3, 10)
      },
      {
        chat: chat._id,
        sender: chat.buyer._id,
        text: 'Здравствуйте. Подскажите, пожалуйста, удобное время для осмотра и подписания документов.',
        readBy: [{ user: chat.buyer._id, readAt: makeDate(-3, 12) }],
        createdAt: makeDate(-3, 12)
      }
    ];

    for (const message of messages) {
      await ChatMessage.create(message);
    }

    chat.lastMessage = {
      text: messages[messages.length - 1].text,
      sender: messages[messages.length - 1].sender,
      attachmentsCount: 0,
      createdAt: messages[messages.length - 1].createdAt
    };
    chat.lastMessageAt = messages[messages.length - 1].createdAt;
    await chat.save();
  }
};

const seedFavorites = async ({ users, auctions }) => {
  const publicAuctions = auctions.filter((auction) =>
    ['application_waiting', 'applications_open', 'bidding_waiting', 'bidding_active', 'finished_success', 'finished_failed'].includes(auction.status)
  );

  for (let index = 0; index < users.length; index += 1) {
    const user = users[index].user;
    const favorites = publicAuctions
      .filter((auction) => auction.owner.toString() !== user._id.toString())
      .slice(index * 2, index * 2 + 8)
      .map((auction) => auction._id);
    user.favoriteAuctions = favorites;
    await user.save();
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

    if (index % 3 !== 1) {
      await createRejectedVerificationHistory({ user, userSeed, moderator, userIndex: index });
    }

    const { verificationData } = await approveVerification({ user, userSeed, moderator, userIndex: index });
    createdUsers.push({ user, seed: userSeed, verificationData });
  }

  const createdAuctions = [];
  let auctionSequence = 0;
  const auctionsPerUser = 15;

  for (let ownerIndex = 0; ownerIndex < createdUsers.length; ownerIndex += 1) {
    const ownerBundle = createdUsers[ownerIndex];

    for (let auctionIndex = 0; auctionIndex < auctionsPerUser; auctionIndex += 1) {
      const sequence = ownerIndex * auctionsPerUser + auctionIndex;
      const requestedStatus = statusPattern[sequence % statusPattern.length];
      const moderator = createdModerators[sequence % createdModerators.length];
      const isPublished = ['application_waiting', 'applications_open', 'bidding_waiting', 'bidding_active', 'finished_success', 'finished_failed'].includes(requestedStatus);
      const hadPreviousRejection = isPublished && sequence % 5 === 0;
      const auctionNumber = isPublished ? `${currentYear}-${String(++auctionSequence).padStart(6, '0')}` : null;

      const auctionData = await buildAuction({
        owner: ownerBundle.user,
        ownerSeed: ownerBundle.seed,
        ownerIndex,
        auctionIndex,
        verificationData: ownerBundle.verificationData,
        status: requestedStatus,
        auctionNumber,
        previousRejection: hadPreviousRejection,
        sequence
      });

      if (requestedStatus === 'pending') {
        auctionData.submittedAt = new Date(Date.now() - (2 + (sequence % 20)) * 60 * 60 * 1000);
      }

      if (requestedStatus === 'returned') {
        auctionData.reviewedBy = moderator._id;
        auctionData.reviewedAt = makeDate(-1, 16);
      }

      if (requestedStatus === 'cancelled') {
        auctionData.auctionNumber = `${currentYear}-${String(++auctionSequence).padStart(6, '0')}`;
        auctionData.submittedAt = makeDate(-4, 12);
        auctionData.reviewedBy = moderator._id;
        auctionData.reviewedAt = makeDate(-2, 15);
      }

      if (isPublished) {
        auctionData.reviewedBy = moderator._id;
        auctionData.reviewedAt = makeDate(-2, 16);
      }

      const auction = await Auction.create(auctionData);
      createdAuctions.push(auction);

      if (requestedStatus === 'pending') {
        await createNotification({
          user: ownerBundle.user,
          type: 'auction_submitted',
          title: 'Аукцион отправлен на модерацию',
          body: `Заявка по аукциону "${auction.item.title}" ожидает проверки модератором.`,
          importance: 'normal',
          auction
        });
      }

      if (requestedStatus === 'returned') {
        await addReviewForAuction({
          auction,
          moderator,
          action: 'returned',
          comment: auction.moderationComment,
          snapshotStatus: 'pending'
        });
        await createNotification({
          user: ownerBundle.user,
          type: 'auction_returned',
          title: 'Аукцион отклонен модератором',
          body: auction.moderationComment,
          auction
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
          comment: hadPreviousRejection ? 'После доработки заявка одобрена.' : 'Заявка на публикацию аукциона одобрена.',
          snapshotStatus: 'pending'
        });
        await createNotification({
          user: ownerBundle.user,
          type: 'auction_published',
          title: 'Ваш аукцион опубликован',
          body: `Аукцион "${auction.item.title}" опубликован и доступен в каталоге.`,
          auction
        });
      }

      if (requestedStatus === 'cancelled') {
        await addReviewForAuction({
          auction,
          moderator,
          action: 'cancelled',
          comment: auction.resultReason,
          snapshotStatus: 'cancelled'
        });
        await createNotification({
          user: ownerBundle.user,
          type: 'auction_cancelled',
          title: 'Аукцион отменен',
          body: auction.resultReason,
          importance: 'critical',
          auction
        });
      }
    }
  }

  await Counter.findOneAndUpdate(
    { key: `auction-number:${currentYear}` },
    { $set: { key: `auction-number:${currentYear}`, value: auctionSequence } },
    { upsert: true }
  );

  const participationAuctions = createdAuctions.filter((auction) =>
    ['applications_open', 'bidding_waiting', 'bidding_active', 'finished_success', 'finished_failed'].includes(auction.status)
  );

  for (let index = 0; index < participationAuctions.length; index += 1) {
    await seedParticipation({ auction: participationAuctions[index], users: createdUsers, index });
  }

  await seedFavorites({ users: createdUsers, auctions: createdAuctions });
  await seedChatMessages();

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
  const participationStats = await AuctionApplication.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]);

  console.log(`Seeded ${envName} database.`);
  console.log(`Created ${createdUsers.length} users, ${createdModerators.length} moderators, ${createdAuctions.length} auctions.`);
  console.table(statusStats);
  console.table(participationStats.map((row) => ({ status: row._id, count: row.count })));
  console.log('Verification histories include rejected -> approved cases for most users.');
  console.log('Auction histories include drafts, pending requests, returned requests, approvals, cancellations, finished auctions, protocols, favorites, notifications and deal chats.');
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
