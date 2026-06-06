import React, { useEffect, useMemo, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { Check, CheckCheck, Download, FileText, LoaderCircle, Paperclip, Send } from 'lucide-react';
import { useSelector } from 'react-redux';
import { apiRequest, authHeader } from '../../../api/client.js';
import AuctionCard from '../../auction/AuctionCard.jsx';
import LoadingState from '../../ui/LoadingState.jsx';
import { formatDateTime } from '../../../utils/formatters.js';
import { formatPhoneDisplay } from '../../../utils/inputFormatters.js';
import { getSocketBaseUrl } from '../../../utils/socket.js';
import styles from './MyChats.module.css';

const participantFieldLabels = {
  fullName: 'ФИО',
  organizationName: 'Краткое наименование',
  phone: 'Телефон',
  email: 'Электронная почта',
  unp: 'УНП / ИНН',
  legalAddress: 'Юридический адрес',
  postalAddress: 'Почтовый адрес'
};

const getParticipantFields = (participantInfo = {}) => {
  const keys = participantInfo.accountType === 'legal_entity'
    ? ['organizationName', 'unp', 'legalAddress', 'email']
    : ['fullName', 'unp', 'phone', 'email', 'postalAddress'];

  return keys
    .map((key) => [
      participantFieldLabels[key],
      key === 'phone' ? formatPhoneDisplay(participantInfo[key]) : participantInfo[key]
    ])
    .filter(([, value]) => value);
};

const isPreviewable = (attachment) =>
  attachment.mimeType?.startsWith('image/') || attachment.mimeType === 'application/pdf' || attachment.mimeType?.startsWith('text/');

function ChatList({ chats, selectedId, onSelect }) {
  return (
    <aside className={styles.chatList}>
      <h2>Чаты сделок</h2>
      {chats.length === 0 && <p className={styles.emptyText}>Чаты появятся после определения победителя аукциона.</p>}
      {chats.map((chat) => (
        <button
          className={`${styles.chatListItem} ${selectedId === chat.id ? styles['chatListItem--active'] : ''}`}
          key={chat.id}
          type="button"
          onClick={() => onSelect(chat.id)}
        >
          <strong>{chat.counterpart?.displayName || 'Собеседник'}</strong>
          <span>{chat.auction?.item?.title || 'Аукцион'}</span>
          {chat.lastMessage ? (
            <small>{chat.lastMessage.text || `Файлы: ${chat.lastMessage.attachmentsCount}`}</small>
          ) : (
            <small>Переписка еще не начата</small>
          )}
          {chat.unreadCount > 0 && <b>{chat.unreadCount}</b>}
        </button>
      ))}
    </aside>
  );
}

function CounterpartSummary({ counterpartInfo, roleLabel }) {
  const fields = getParticipantFields(counterpartInfo);

  return (
    <section className={styles.sellerSummary}>
      <div>
        <span>{roleLabel}</span>
        <h2>{counterpartInfo?.displayName || 'Собеседник'}</h2>
      </div>
      <div className={styles.sellerSummary__grid}>
        {fields.map(([label, value]) => (
          <div key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}

function AttachmentList({ attachments }) {
  if (!attachments?.length) {
    return null;
  }

  return (
    <div className={styles.attachments}>
      {attachments.map((attachment) => (
        attachment.url ? (
          <a
            className={styles.attachment}
            href={attachment.url}
            key={`${attachment.path}-${attachment.originalName}`}
            rel="noreferrer"
            target={isPreviewable(attachment) ? '_blank' : undefined}
            download={!isPreviewable(attachment) ? attachment.originalName : undefined}
          >
            <FileText size={18} />
            <span>{attachment.originalName}</span>
            <Download size={16} />
          </a>
        ) : (
          <span className={styles.attachment} key={`${attachment.path}-${attachment.originalName}`}>
            <FileText size={18} />
            <span>{attachment.originalName}</span>
          </span>
        )
      ))}
    </div>
  );
}

function MessageStatusIcon({ status }) {
  if (status === 'loading') {
    return (
      <span className={`${styles.messageStatus} ${styles['messageStatus--loading']}`} title="Грузится">
        <LoaderCircle size={15} />
      </span>
    );
  }

  if (status === 'viewed') {
    return (
      <span className={`${styles.messageStatus} ${styles['messageStatus--viewed']}`} title="Просмотрено">
        <CheckCheck size={18} />
      </span>
    );
  }

  if (status === 'failed') {
    return <span className={`${styles.messageStatus} ${styles['messageStatus--failed']}`} title="Ошибка отправки">!</span>;
  }

  return (
    <span className={`${styles.messageStatus} ${styles['messageStatus--sent']}`} title="Отправлено">
      <Check size={16} />
    </span>
  );
}

function MessageBubble({ message, isOwn }) {
  return (
    <article className={`${styles.messageBubble} ${isOwn ? styles['messageBubble--own'] : ''}`}>
      {message.text && <p>{message.text}</p>}
      <AttachmentList attachments={message.attachments} />
      <footer>
        <span>{message.createdAt ? formatDateTime(message.createdAt) : 'сейчас'}</span>
        {isOwn && <MessageStatusIcon status={message.status} />}
      </footer>
    </article>
  );
}

function ChatComposer({ disabled, onSend }) {
  const [text, setText] = useState('');
  const [files, setFiles] = useState([]);

  const submit = (event) => {
    event.preventDefault();

    if (!text.trim() && files.length === 0) {
      return;
    }

    onSend({ text, files });
    setText('');
    setFiles([]);
    event.currentTarget.reset();
  };

  const handleKeyDown = (event) => {
    if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) {
      return;
    }

    event.preventDefault();
    event.currentTarget.form?.requestSubmit();
  };

  return (
    <form className={styles.chatComposer} onSubmit={submit}>
      <textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Напишите сообщение"
        disabled={disabled}
      />
      <div className={styles.chatComposer__actions}>
        <label className={styles.fileButton}>
          <Paperclip size={18} />
          <span>{files.length > 0 ? `Файлы: ${files.length}` : 'Прикрепить файлы'}</span>
          <input type="file" multiple onChange={(event) => setFiles([...event.target.files])} disabled={disabled} />
        </label>
        <button type="submit" disabled={disabled}>
          <Send size={18} />
          Отправить
        </button>
      </div>
    </form>
  );
}

function MyChats({
  actionVersion = 0,
  timeOffsetMs = 0,
  onApplyAuction,
  onOpenAuction,
  onPayDepositAuction,
  onPayLotAuction,
  onOpenProtocolAuction,
  onToggleFavoriteAuction
}) {
  const { accessToken, user } = useSelector((state) => state.auth);
  const [chats, setChats] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState('loading');
  const [messageStatus, setMessageStatus] = useState('idle');
  const [error, setError] = useState('');
  const messagesRef = useRef(null);
  const selectedChat = useMemo(() => chats.find((chat) => chat.id === selectedId), [chats, selectedId]);
  const selectedRoleLabel = selectedChat && user?.id && String(selectedChat.seller) === String(user.id)
    ? 'Победитель торгов'
    : 'Продавец имущества';

  useEffect(() => {
    if (!accessToken) {
      return undefined;
    }

    let mounted = true;
    setStatus('loading');

    apiRequest('/chats', { headers: authHeader(accessToken) })
      .then((data) => {
        if (!mounted) {
          return;
        }

        const nextChats = data.chats || [];
        setChats(nextChats);
        setSelectedId((current) => current || nextChats[0]?.id || '');
        setStatus('succeeded');
      })
      .catch((requestError) => {
        if (mounted) {
          setError(requestError.message);
          setStatus('failed');
        }
      });

    return () => {
      mounted = false;
    };
  }, [accessToken, actionVersion]);

  useEffect(() => {
    if (!accessToken || !selectedId) {
      setMessages([]);
      return undefined;
    }

    let mounted = true;
    setMessageStatus('loading');

    apiRequest(`/chats/${selectedId}/messages`, { headers: authHeader(accessToken) })
      .then((data) => {
        if (!mounted) {
          return;
        }

        setMessages(data.messages || []);
        setChats((current) => current.map((chat) => (chat.id === selectedId ? { ...chat, ...data.chat, unreadCount: 0 } : chat)));
        setMessageStatus('succeeded');
      })
      .catch((requestError) => {
        if (mounted) {
          setError(requestError.message);
          setMessageStatus('failed');
        }
      });

    return () => {
      mounted = false;
    };
  }, [accessToken, selectedId]);

  useEffect(() => {
    if (!accessToken || !selectedId) {
      return undefined;
    }

    const socket = io(getSocketBaseUrl(), { auth: { token: accessToken } });
    socket.emit('chat:join', selectedId);

    socket.on('chat:message', (payload) => {
      if (payload.chatId !== selectedId || !payload.message) {
        return;
      }

      setMessages((current) => {
        if (current.some((message) => message.id === payload.message.id)) {
          return current;
        }

        return [...current, payload.message];
      });

      setChats((current) => current.map((chat) => (
        chat.id === selectedId
          ? {
              ...chat,
              lastMessage: {
                text: payload.message.text,
                attachmentsCount: payload.message.attachments?.length || 0,
                sender: payload.message.sender,
                createdAt: payload.message.createdAt
              },
              lastMessageAt: payload.message.createdAt,
              unreadCount: payload.message.sender === user?.id ? chat.unreadCount : 0
            }
          : chat
      )));

      if (payload.message.sender !== user?.id) {
        apiRequest(`/chats/${selectedId}/read`, {
          method: 'POST',
          headers: authHeader(accessToken),
          body: JSON.stringify({})
        }).catch(() => {});
      }
    });

    socket.on('chat:read', (payload) => {
      if (payload.chatId !== selectedId || payload.readerId === user?.id) {
        return;
      }

      setMessages((current) => current.map((message) => (
        payload.messageIds?.includes(message.id) ? { ...message, status: 'viewed' } : message
      )));
    });

    return () => {
      socket.emit('chat:leave', selectedId);
      socket.disconnect();
    };
  }, [accessToken, selectedId, user?.id]);

  useEffect(() => {
    messagesRef.current?.scrollTo({ top: messagesRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length, selectedId]);

  const sendMessage = ({ text, files }) => {
    if (!selectedId || !accessToken) {
      return;
    }

    const tempId = `temp-${Date.now()}`;
    const tempMessage = {
      id: tempId,
      chat: selectedId,
      sender: user.id,
      text: text.trim(),
      attachments: files.map((file) => ({
        originalName: file.name,
        mimeType: file.type,
        size: file.size,
        path: file.name,
        url: ''
      })),
      status: 'loading',
      createdAt: new Date().toISOString()
    };
    const formData = new FormData();
    formData.append('text', text);
    files.forEach((file) => formData.append('attachments', file));

    setMessages((current) => [...current, tempMessage]);

    apiRequest(`/chats/${selectedId}/messages`, {
      method: 'POST',
      headers: authHeader(accessToken),
      body: formData
    })
      .then((data) => {
        setMessages((current) => {
          const withoutTemp = current.filter((message) => message.id !== tempId);
          return withoutTemp.some((message) => message.id === data.message.id) ? withoutTemp : [...withoutTemp, data.message];
        });
        setChats((current) => current.map((chat) => (chat.id === selectedId ? data.chat : chat)));
      })
      .catch((requestError) => {
        setError(requestError.message);
        setMessages((current) => current.map((message) => (
          message.id === tempId ? { ...message, status: 'failed' } : message
        )));
      });
  };

  if (status === 'loading') {
    return <LoadingState text="Загрузка чатов" />;
  }

  return (
    <section className={styles.chatPanel}>
      <ChatList chats={chats} selectedId={selectedId} onSelect={setSelectedId} />
      <div className={styles.chatWorkspace}>
        {error && <p className={styles.message__error}>{error}</p>}
        {!selectedChat && (
          <div className={styles.emptyWorkspace}>
            <h1>Чаты сделок</h1>
            <p>Выберите чат слева. Чаты создаются автоматически после определения победителя аукциона.</p>
          </div>
        )}
        {selectedChat && (
          <>
            <CounterpartSummary counterpartInfo={selectedChat.counterpart} roleLabel={selectedRoleLabel} />
            <div className={styles.chatAuctionCard}>
              <AuctionCard
                auction={selectedChat.auction}
                participant={selectedChat.auction?.viewerParticipation}
                isAuthenticated={Boolean(user)}
                isVerified={user?.verificationStatus === 'approved'}
                currentUserId={user?.id}
                userRole={user?.role}
                mode="public"
                timeOffsetMs={timeOffsetMs}
                onApply={onApplyAuction}
                onOpen={() => onOpenAuction?.(selectedChat.auction?.id)}
                onPayDeposit={onPayDepositAuction}
                onPayLot={onPayLotAuction}
                onOpenProtocol={onOpenProtocolAuction}
                onToggleFavorite={onToggleFavoriteAuction}
              />
            </div>
            <div className={styles.messages} ref={messagesRef}>
              {messageStatus === 'loading' && <LoadingState compact text="Загрузка сообщений" />}
              {messageStatus !== 'loading' && messages.length === 0 && (
                <p className={styles.emptyText}>Сообщений пока нет. Начните переписку по сделке.</p>
              )}
              {messages.map((message) => (
                <MessageBubble key={message.id} message={message} isOwn={message.sender === user?.id} />
              ))}
            </div>
            <ChatComposer disabled={messageStatus === 'loading'} onSend={sendMessage} />
          </>
        )}
      </div>
    </section>
  );
}

export default MyChats;
