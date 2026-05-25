let yandexMapsPromise;

export const getYandexMaps = (apiKey = '') => {
  if (window.ymaps) {
    return Promise.resolve(window.ymaps);
  }

  if (yandexMapsPromise) {
    return yandexMapsPromise;
  }

  yandexMapsPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    const keyParam = apiKey ? `apikey=${apiKey}&` : '';
    script.src = `https://api-maps.yandex.ru/2.1/?${keyParam}lang=ru_RU`;
    script.async = true;
    script.onload = () => {
      window.ymaps.ready(() => resolve(window.ymaps));
    };
    script.onerror = () => reject(new Error('Не удалось загрузить Яндекс.Карты'));
    document.head.appendChild(script);
  });

  return yandexMapsPromise;
};
