const VAT_RATE = 0.2;
const ORGANIZATION_FEE_PERCENT = 1;
const DEPOSIT_RETURN_DAYS = 10;

const auctionCategories = [
  'passenger_cars',
  'trucks',
  'buses',
  'motorcycles',
  'personal_mobility',
  'real_estate',
  'machines_equipment',
  'special_equipment',
  'other_property'
];

const auctionCategoryLabels = {
  passenger_cars: 'Легковые автомобили',
  trucks: 'Грузовые автомобили',
  buses: 'Автобусы',
  motorcycles: 'Мототехника',
  personal_mobility: 'Средства персональной мобильности',
  real_estate: 'Недвижимость',
  machines_equipment: 'Станки и оборудование',
  special_equipment: 'Спецтехника',
  other_property: 'Другое имущество'
};

const operatorInfo = {
  name: 'ЗАО "БасТорг"',
  contactPerson: 'Бас Михаил Андреевич',
  address: 'г. Минск, ул. Калиновского, 79',
  email: 'miha@gmail.com',
  unp: '192822249'
};

module.exports = {
  VAT_RATE,
  ORGANIZATION_FEE_PERCENT,
  DEPOSIT_RETURN_DAYS,
  auctionCategories,
  auctionCategoryLabels,
  operatorInfo
};
