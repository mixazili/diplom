import React, { useEffect, useRef, useState } from 'react';
import styles from '../../../App.module.css';

const DEFAULT_CENTER = [53.9023, 27.5619];
const DEFAULT_ZOOM = 11;
let yandexMapsPromise;

const getYandexMaps = (apiKey) => {
  if (window.ymaps) {
    return Promise.resolve(window.ymaps);
  }

  if (yandexMapsPromise) {
    return yandexMapsPromise;
  }

  yandexMapsPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://api-maps.yandex.ru/2.1/?apikey=${apiKey}&lang=ru_RU`;
    script.async = true;
    script.onload = () => {
      window.ymaps.ready(() => resolve(window.ymaps));
    };
    script.onerror = () => reject(new Error('Не удалось загрузить Яндекс.Карты'));
    document.head.appendChild(script);
  });

  return yandexMapsPromise;
};

function YandexMapPicker({ value, onChange, error }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const placemarkRef = useRef(null);
  const [loadError, setLoadError] = useState('');
  const apiKey = import.meta.env.VITE_YANDEX_MAPS_API_KEY;
  const selectedCoords = Number.isFinite(Number(value?.lat)) && Number.isFinite(Number(value?.lng))
    ? [Number(value.lat), Number(value.lng)]
    : null;

  useEffect(() => {
    if (!apiKey) {
      setLoadError('Не указан ключ VITE_YANDEX_MAPS_API_KEY');
      return undefined;
    }

    let isMounted = true;

    getYandexMaps(apiKey)
      .then((ymaps) => {
        if (!isMounted || !mapRef.current || mapInstanceRef.current) {
          return;
        }

        const map = new ymaps.Map(
          mapRef.current,
          {
            center: selectedCoords || DEFAULT_CENTER,
            zoom: selectedCoords ? 14 : DEFAULT_ZOOM,
            controls: []
          },
          {
            suppressMapOpenBlock: true,
            yandexMapDisablePoiInteractivity: true
          }
        );

        map.behaviors.disable(['scrollZoom', 'rightMouseButtonMagnifier']);

        const setPoint = (coords) => {
          if (!placemarkRef.current) {
            placemarkRef.current = new ymaps.Placemark(
              coords,
              { hintContent: 'Местонахождение предмета торгов' },
              { preset: 'islands#redIcon', draggable: true }
            );
            placemarkRef.current.events.add('dragend', () => {
              const draggedCoords = placemarkRef.current.geometry.getCoordinates();
              onChange({ lat: draggedCoords[0].toFixed(6), lng: draggedCoords[1].toFixed(6) });
            });
            map.geoObjects.add(placemarkRef.current);
          } else {
            placemarkRef.current.geometry.setCoordinates(coords);
          }

          map.setCenter(coords, Math.max(map.getZoom(), 14), { duration: 180 });
        };

        if (selectedCoords) {
          setPoint(selectedCoords);
        }

        map.events.add('click', (event) => {
          const coords = event.get('coords');
          setPoint(coords);
          onChange({ lat: coords[0].toFixed(6), lng: coords[1].toFixed(6) });
        });

        mapInstanceRef.current = map;
      })
      .catch((errorObject) => {
        if (isMounted) {
          setLoadError(errorObject.message);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [apiKey]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    const placemark = placemarkRef.current;

    if (!map || !selectedCoords) {
      return;
    }

    if (placemark) {
      placemark.geometry.setCoordinates(selectedCoords);
    }

    map.setCenter(selectedCoords, Math.max(map.getZoom(), 14), { duration: 180 });
  }, [value?.lat, value?.lng]);

  useEffect(
    () => () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.destroy();
        mapInstanceRef.current = null;
        placemarkRef.current = null;
      }
    },
    []
  );

  return (
    <div className={styles.mapPicker}>
      <div className={styles.mapPicker__header}>
        <div>
          <span className={styles.field__label}>Геолокация на карте</span>
          <p>Кликните по карте, чтобы указать место нахождения предмета торгов. Метку можно перетащить.</p>
        </div>
        {selectedCoords && (
          <strong>{selectedCoords[0].toFixed(6)}, {selectedCoords[1].toFixed(6)}</strong>
        )}
      </div>
      <div className={styles.mapPicker__canvas} ref={mapRef}>
        {loadError && <span>{loadError}</span>}
      </div>
      {(error || loadError) && <span className={styles.field__error}>{error || loadError}</span>}
    </div>
  );
}

export default YandexMapPicker;
