import React, { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';
import { apiRequest, getApiBaseUrl } from '../../api/client.js';
import LoadingState from '../ui/LoadingState.jsx';
import styles from './AuctionProtocolModal.module.css';

function AuctionProtocolModal({ auction, onClose }) {
  const [protocol, setProtocol] = useState(null);
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!auction?.id) {
      return undefined;
    }

    let mounted = true;
    setStatus('loading');
    setMessage('');

    apiRequest(`/auctions/public/${auction.id}/protocol`)
      .then((data) => {
        if (!mounted) {
          return;
        }

        setProtocol(data.protocol);
        setStatus('succeeded');
      })
      .catch((error) => {
        if (mounted) {
          setMessage(error.message);
          setStatus('failed');
        }
      });

    return () => {
      mounted = false;
    };
  }, [auction?.id]);

  if (!auction) {
    return null;
  }

  const downloadUrl = `${getApiBaseUrl()}/auctions/public/${auction.id}/protocol/download`;

  return (
    <div className={styles.protocolModalBackdrop} role="presentation">
      <section className={styles.protocolModal} role="dialog" aria-modal="true" aria-label="Протокол электронных торгов">
        <header className={styles.protocolModal__header}>
          <div>
            <span>Протокол электронных торгов</span>
            <h2>{auction.auctionNumber ? `Аукцион №${auction.auctionNumber}` : auction.item?.title || 'Аукцион'}</h2>
          </div>
          <div className={styles.protocolModal__actions}>
            <a className={styles.protocolModal__download} href={downloadUrl}>
              <Download size={18} />
              Скачать
            </a>
            <button className={styles.protocolModal__close} type="button" onClick={onClose} aria-label="Закрыть протокол">
              <X size={24} />
            </button>
          </div>
        </header>

        <div className={styles.protocolModal__body}>
          {status === 'loading' && <LoadingState text="Загрузка протокола" />}
          {status === 'failed' && <p className={styles.protocolModal__error}>{message}</p>}
          {status === 'succeeded' && protocol?.contentHtml && (
            <iframe
              className={styles.protocolModal__frame}
              srcDoc={protocol.contentHtml}
              title="Протокол электронных торгов"
            />
          )}
        </div>
      </section>
    </div>
  );
}

export default AuctionProtocolModal;
