import React, { useEffect, useRef, useState } from 'react';
import styles from '../../App.module.css';

let yandexMapsPromise;

const getYandexMaps = () => {
  if (window.ymaps) {
    return Promise.resolve(window.ymaps);
  }

  if (yandexMapsPromise) {
    return yandexMapsPromise;
  }

  yandexMapsPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://api-maps.yandex.ru/2.1/?lang=ru_RU';
    script.async = true;
    script.onload = () => {
      window.ymaps.ready(() => resolve(window.ymaps));
    };
    script.onerror = () => reject(new Error('Не удалось загрузить Яндекс.Карты'));
    document.head.appendChild(script);
  });

  return yandexMapsPromise;
};

const hasCoordinates = (geoLocation) =>
  geoLocation?.lat !== undefined &&
  geoLocation?.lat !== null &&
  geoLocation?.lng !== undefined &&
  geoLocation?.lng !== null &&
  Number.isFinite(Number(geoLocation.lat)) &&
  Number.isFinite(Number(geoLocation.lng));

function AuctionMapPreview({ geoLocation, address }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const [loadError, setLoadError] = useState('');
  const coords = hasCoordinates(geoLocation) ? [Number(geoLocation.lat), Number(geoLocation.lng)] : null;

  useEffect(() => {
    if (!coords) {
      return undefined;
    }

    let isMounted = true;

    getYandexMaps()
      .then((ymaps) => {
        if (!isMounted || !mapRef.current || mapInstanceRef.current) {
          return;
        }

        const map = new ymaps.Map(
          mapRef.current,
          {
            center: coords,
            zoom: 15,
            controls: []
          },
          {
            suppressMapOpenBlock: true,
            yandexMapDisablePoiInteractivity: true
          }
        );

        map.behaviors.disable(['dblClickZoom', 'multiTouch', 'rightMouseButtonMagnifier']);

        const placemark = new ymaps.Placemark(
          coords,
          {
            hintContent: address || 'Местонахождение предмета торгов',
            balloonContent: address || 'Местонахождение предмета торгов'
          },
          {
            preset: 'islands#redIcon',
            draggable: false
          }
        );

        map.geoObjects.add(placemark);
        mapInstanceRef.current = map;
      })
      .catch((error) => {
        if (isMounted) {
          setLoadError(error.message);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [coords?.[0], coords?.[1], address]);

  useEffect(
    () => () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.destroy();
        mapInstanceRef.current = null;
      }
    },
    []
  );

  if (!coords) {
    return null;
  }

  return (
    <section className={styles.detailSection}>
      <h3 className={styles.detailSection__title}>Геолокация на карте</h3>
      <div className={styles.mapPicker__canvas} ref={mapRef}>
        {loadError && <span>{loadError}</span>}
      </div>
    </section>
  );
}

export default AuctionMapPreview;
