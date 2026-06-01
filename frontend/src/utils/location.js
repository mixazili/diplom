export const regions = [
  ['minsk_city', 'г. Минск'],
  ['minsk_region', 'Минская область'],
  ['brest_region', 'Брестская область'],
  ['vitebsk_region', 'Витебская область'],
  ['gomel_region', 'Гомельская область'],
  ['grodno_region', 'Гродненская область'],
  ['mogilev_region', 'Могилевская область']
];

export const citiesByRegion = {
  minsk_city: ['Минск'],
  minsk_region: ['Минск', 'Борисов', 'Солигорск', 'Молодечно', 'Жодино', 'Слуцк', 'Дзержинск', 'Вилейка', 'Марьина Горка', 'Смолевичи'],
  brest_region: ['Брест', 'Барановичи', 'Пинск', 'Кобрин', 'Береза', 'Ивацевичи', 'Лунинец', 'Пружаны', 'Иваново', 'Дрогичин'],
  vitebsk_region: ['Витебск', 'Орша', 'Новополоцк', 'Полоцк', 'Поставы', 'Глубокое', 'Лепель', 'Новолукомль', 'Толочин', 'Браслав'],
  gomel_region: ['Гомель', 'Мозырь', 'Жлобин', 'Речица', 'Светлогорск', 'Калинковичи', 'Рогачев', 'Добруш', 'Житковичи', 'Хойники'],
  grodno_region: ['Гродно', 'Лида', 'Слоним', 'Волковыск', 'Сморгонь', 'Новогрудок', 'Ошмяны', 'Мосты', 'Щучин', 'Ивье'],
  mogilev_region: ['Могилев', 'Бобруйск', 'Горки', 'Осиповичи', 'Кричев', 'Быхов', 'Климовичи', 'Шклов', 'Мстиславль', 'Чаусы']
};

const normalize = (value = '') =>
  String(value)
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[.,;:()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const regionTokens = {
  minsk_city: ['г минск', 'город минск'],
  minsk_region: ['минская область', 'минская обл', 'минская о'],
  brest_region: ['брестская область', 'брестская обл', 'брестская о'],
  vitebsk_region: ['витебская область', 'витебская обл', 'витебская о'],
  gomel_region: ['гомельская область', 'гомельская обл', 'гомельская о'],
  grodno_region: ['гродненская область', 'гродненская обл', 'гродненская о'],
  mogilev_region: ['могилевская область', 'могилевская обл', 'могилевская о']
};

const includesToken = (source, token) => source.includes(normalize(token));

export const resolveLocation = (address = '', item = {}) => {
  if (item.locationRegion || item.locationCity) {
    return {
      regionKey: regions.find(([_, label]) => label === item.locationRegion)?.[0] || '',
      regionLabel: item.locationRegion || '',
      city: item.locationCity || ''
    };
  }

  const normalizedAddress = normalize(address);
  const regionEntry = regions.find(([key]) => (regionTokens[key] || []).some((token) => includesToken(normalizedAddress, token)));
  const regionKey = regionEntry?.[0] || '';
  const regionLabel = regionEntry?.[1] || '';
  const cityPool = regionKey ? citiesByRegion[regionKey] || [] : Object.values(citiesByRegion).flat();
  const city = cityPool.find((itemCity) => {
    const normalizedCity = normalize(itemCity);
    return normalizedAddress.includes(`г ${normalizedCity}`) ||
      normalizedAddress.includes(`город ${normalizedCity}`) ||
      normalizedAddress.split(' ').includes(normalizedCity);
  }) || '';

  return { regionKey, regionLabel, city };
};

export const formatCardLocation = (address = '', item = {}) => {
  const location = resolveLocation(address, item);

  if (location.regionLabel && location.city) {
    return location.regionLabel === 'г. Минск' ? 'г. Минск' : `${location.regionLabel}, ${location.city}`;
  }

  return location.city || location.regionLabel || String(address || '').trim() || 'Местоположение не указано';
};
