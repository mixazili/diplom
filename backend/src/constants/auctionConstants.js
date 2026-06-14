const auctionCategoryLabels = {
  passenger_cars: 'Легковые автомобили',
  commercial_cars: 'Коммерческий транспорт',
  trucks: 'Грузовые автомобили',
  buses: 'Автобусы',
  motorcycles: 'Мототехника',
  trailers: 'Прицепы и полуприцепы',
  water_transport: 'Водный транспорт',
  personal_mobility: 'Средства персональной мобильности',
  vehicle_parts: 'Запчасти и комплектующие',
  apartments: 'Квартиры',
  houses: 'Дома и коттеджи',
  commercial_real_estate: 'Коммерческая недвижимость',
  land_plots: 'Земельные участки',
  garages: 'Гаражи и машино-места',
  real_estate: 'Другая недвижимость',
  machines_equipment: 'Станки и промышленное оборудование',
  special_equipment: 'Спецтехника',
  warehouse_equipment: 'Складское оборудование',
  construction_equipment: 'Строительное оборудование',
  tools: 'Инструменты',
  agricultural_equipment: 'Сельскохозяйственная техника',
  livestock: 'Животные',
  farm_products: 'Сельскохозяйственная продукция',
  raw_materials: 'Сырье и материалы',
  food_equipment: 'Пищевое оборудование',
  medical_equipment: 'Медицинское оборудование',
  office_equipment: 'Офисное оборудование',
  art: 'Искусство',
  antiques: 'Антиквариат',
  books: 'Книги',
  jewelry: 'Ювелирные изделия',
  watches: 'Часы',
  coins: 'Монеты и банкноты',
  stamps: 'Марки и открытки',
  musical_instruments: 'Музыкальные инструменты',
  collectibles: 'Коллекционные предметы',
  electronics: 'Электроника и техника',
  computers: 'Компьютеры и комплектующие',
  phones: 'Телефоны и связь',
  home_appliances: 'Бытовая техника',
  furniture: 'Мебель',
  clothing: 'Одежда',
  sports: 'Спорт и отдых',
  children_goods: 'Детские товары',
  building_materials: 'Строительные материалы',
  business_inventory: 'Товарные остатки',
  scrap: 'Лом и вторсырье',
  intangible_assets: 'Права требования и активы',
  mixed_lots: 'Смешанные лоты',
  other_property: 'Другое имущество'
};

const auctionCategories = Object.keys(auctionCategoryLabels);

const operatorInfo = {
  name: 'ЗАО "БасТорг"',
  contactPerson: 'Бас Михаил Андреевич',
  address: 'г. Минск, ул. Калиновского, 79',
  phone: '+375292336767',
  email: 'miha@gmail.com',
  unp: '192822249'
};

const buyerTerms = {
  obligations: [
    'Победитель торгов либо единственный участник, давший согласие на приобретение лота, обязан полностью оплатить выигранный лот и возместить затраты на организацию и проведение аукциона.',
    'Победитель торгов и продавец обязаны подписать протокол по результатам торгов.',
    'Победитель торгов и продавец обязаны заключить договор купли-продажи предмета торгов.'
  ],
  responsibility: [
    'При отказе или уклонении победителя от подписания протокола, заключения договора, возмещения затрат или оплаты предмета торгов результаты торгов аннулируются, а внесенный задаток возврату не подлежит.',
    'Отказ от приобретения предмета торгов не освобождает победителя от оплаты услуг оператора торгов.',
    'Продавец несет ответственность за достоверность сведений о предмете торгов и готовность заключить договор с победителем.'
  ]
};

module.exports = {
  auctionCategories,
  auctionCategoryLabels,
  buyerTerms,
  operatorInfo
};
