export const auctionCategories = [
  ['passenger_cars', 'Легковые автомобили'],
  ['commercial_cars', 'Коммерческий транспорт'],
  ['trucks', 'Грузовые автомобили'],
  ['buses', 'Автобусы'],
  ['motorcycles', 'Мототехника'],
  ['trailers', 'Прицепы и полуприцепы'],
  ['water_transport', 'Водный транспорт'],
  ['personal_mobility', 'Средства персональной мобильности'],
  ['vehicle_parts', 'Запчасти и комплектующие'],

  ['apartments', 'Квартиры'],
  ['houses', 'Дома и коттеджи'],
  ['commercial_real_estate', 'Коммерческая недвижимость'],
  ['land_plots', 'Земельные участки'],
  ['garages', 'Гаражи и машино-места'],
  ['real_estate', 'Другая недвижимость'],
  ['machines_equipment', 'Станки и промышленное оборудование'],
  ['special_equipment', 'Спецтехника'],
  ['warehouse_equipment', 'Складское оборудование'],
  ['construction_equipment', 'Строительное оборудование'],
  ['tools', 'Инструменты'],

  ['agricultural_equipment', 'Сельскохозяйственная техника'],
  ['livestock', 'Животные'],
  ['farm_products', 'Сельскохозяйственная продукция'],
  ['raw_materials', 'Сырье и материалы'],
  ['food_equipment', 'Пищевое оборудование'],
  ['medical_equipment', 'Медицинское оборудование'],
  ['office_equipment', 'Офисное оборудование'],

  ['art', 'Искусство'],
  ['antiques', 'Антиквариат'],
  ['books', 'Книги'],
  ['jewelry', 'Ювелирные изделия'],
  ['watches', 'Часы'],
  ['coins', 'Монеты и банкноты'],
  ['stamps', 'Марки и открытки'],
  ['musical_instruments', 'Музыкальные инструменты'],
  ['collectibles', 'Коллекционные предметы'],

  ['electronics', 'Электроника и техника'],
  ['computers', 'Компьютеры и комплектующие'],
  ['phones', 'Телефоны и связь'],
  ['home_appliances', 'Бытовая техника'],
  ['furniture', 'Мебель'],
  ['clothing', 'Одежда'],
  ['sports', 'Спорт и отдых'],
  ['children_goods', 'Детские товары'],
  ['building_materials', 'Строительные материалы'],

  ['business_inventory', 'Товарные остатки'],
  ['scrap', 'Лом и вторсырье'],
  ['intangible_assets', 'Права требования и активы'],
  ['mixed_lots', 'Смешанные лоты'],
  ['other_property', 'Другое имущество']
];

export const auctionCategoryGroups = [
  {
    label: 'Транспорт',
    values: [
      'passenger_cars',
      'commercial_cars',
      'trucks',
      'buses',
      'motorcycles',
      'trailers',
      'water_transport',
      'personal_mobility',
      'vehicle_parts'
    ]
  },
  {
    label: 'Недвижимость и оборудование',
    values: [
      'apartments',
      'houses',
      'commercial_real_estate',
      'land_plots',
      'garages',
      'real_estate',
      'machines_equipment',
      'special_equipment',
      'warehouse_equipment',
      'construction_equipment',
      'tools'
    ]
  },
  {
    label: 'Сельское хозяйство и бизнес',
    values: [
      'agricultural_equipment',
      'livestock',
      'farm_products',
      'raw_materials',
      'food_equipment',
      'medical_equipment',
      'office_equipment'
    ]
  },
  {
    label: 'Коллекции и ценности',
    values: [
      'art',
      'antiques',
      'books',
      'jewelry',
      'watches',
      'coins',
      'stamps',
      'musical_instruments',
      'collectibles'
    ]
  },
  {
    label: 'Товары и имущество',
    values: [
      'electronics',
      'computers',
      'phones',
      'home_appliances',
      'furniture',
      'clothing',
      'sports',
      'children_goods',
      'building_materials'
    ]
  },
  {
    label: 'Другое',
    values: ['business_inventory', 'scrap', 'intangible_assets', 'mixed_lots', 'other_property']
  }
];

export const auctionCategoryLabels = Object.fromEntries(auctionCategories);
