export const auctionCategories = [
  ['passenger_cars', 'Легковые авто'],
  ['trucks', 'Грузовые авто'],
  ['buses', 'Автобусы'],
  ['motorcycles', 'Мототехника'],
  ['personal_mobility', 'Средства персональной мобильности'],
  ['real_estate', 'Недвижимость'],
  ['machines_equipment', 'Станки и оборудование'],
  ['special_equipment', 'Спецтехника'],
  ['art', 'Искусство'],
  ['antiques', 'Антиквариат'],
  ['books', 'Книги'],
  ['jewelry', 'Ювелирные изделия'],
  ['electronics', 'Электроника и техника'],
  ['clothes', 'Одежда'],
  ['other_property', 'Другое имущество']
];

export const auctionCategoryGroups = [
  {
    label: 'Транспорт',
    values: ['passenger_cars', 'trucks', 'buses', 'motorcycles', 'personal_mobility']
  },
  {
    label: 'Недвижимость и оборудование',
    values: ['real_estate', 'machines_equipment', 'special_equipment']
  },
  {
    label: 'Коллекции и ценности',
    values: ['art', 'antiques', 'books', 'jewelry']
  },
  {
    label: 'Товары и имущество',
    values: ['electronics', 'clothes', 'other_property']
  }
];

export const auctionCategoryLabels = Object.fromEntries(auctionCategories);
