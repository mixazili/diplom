import React from 'react';
import { Camera, Play, Send } from 'lucide-react';
import styles from './Layout.module.css';

const linkGroups = [
  ['Информация', [
    ['Как продать/купить?', { name: 'static', options: { slug: 'howTo' } }],
    ['Инструкция по участию в торгах', { name: 'static', options: { slug: 'biddingGuide' } }],
    ['Инструкция по созданию аукциона', { name: 'static', options: { slug: 'sellerGuide' } }],
    ['Пользовательское соглашение', { name: 'static', options: { slug: 'userAgreement' } }],
    ['Политика обработки персональных данных', { name: 'static', options: { slug: 'privacyPolicy' } }],
    ['Оплата', { name: 'static', options: { slug: 'payment' } }]
  ]],
  ['Контакты', [
    ['О компании', { name: 'static', options: { slug: 'company' } }],
    ['Контакты', { name: 'static', options: { slug: 'contacts' } }],
    ['Связаться со службой поддержки', { name: 'static', options: { slug: 'support' } }]
  ]],
  ['Аккаунт', [
    ['Вход', { authMode: 'login' }],
    ['Регистрация', { authMode: 'register' }]
  ]]
];

function FooterLink({ children, onClick }) {
  return (
    <button type="button" onClick={onClick}>
      {children}
    </button>
  );
}

function SiteFooter({ onAuthMode, onNavigate }) {
  return (
    <footer className={styles.siteFooter}>
      <div className={styles.siteFooter__brand}>
        <button className={styles.siteFooter__logo} type="button" onClick={() => onNavigate('home')}>
          <strong>Auction.by</strong>
          <span>Платформа онлайн-аукционов</span>
        </button>
        <div className={styles.siteFooter__socials}>
          <FooterLink><Send size={18} aria-label="Telegram" /></FooterLink>
          <FooterLink><Camera size={18} aria-label="Instagram" /></FooterLink>
          <FooterLink><Play size={20} aria-label="YouTube" /></FooterLink>
        </div>
      </div>

      <div className={styles.siteFooter__links}>
        {linkGroups.map(([title, links]) => (
          <section key={title}>
            <h3>{title}</h3>
            {links.map(([label, target]) => (
              target.authMode ? (
                <button type="button" key={label} onClick={() => onAuthMode(target.authMode)}>{label}</button>
              ) : (
                <FooterLink key={label} onClick={() => onNavigate(target.name, target.options)}>{label}</FooterLink>
              )
            ))}
          </section>
        ))}
      </div>

      <div className={styles.siteFooter__company}>
        <section>
          <h3>ЗАО "БасТорг"</h3>
          <p>Оператор торгов: Закрытое акционерное общество "БасТорг"</p>
          <p>ФИО контактного лица: Бас Михаил Андреевич</p>
          <p>Адрес: г. Минск, ул. Калиновского 79</p>
          <p>Телефон: +375292336767</p>
          <p>Эл. почта: miha@gmail.com</p>
          <p>УНП 192822249</p>
        </section>
        <section>
          <p>Зарегистрировано в торговом реестре Республики Беларусь:</p>
          <p>№228335 от 10.05.2026 "Оптовая торговля без торговых объектов"</p>
          <p>№228336 от 10.05.2026 "Торговля на аукционах"</p>
          <p>© 2026 Закрытое акционерное общество "БасТорг" - Все права защищены авторским правом.</p>
        </section>
      </div>
    </footer>
  );
}

export default SiteFooter;
