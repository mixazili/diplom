import React, { useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { ArrowRight, CreditCard, FileText, HelpCircle, Mail, MapPin, Phone, ShieldCheck } from 'lucide-react';
import { apiRequest } from '../../api/client.js';
import styles from './StaticInfoPage.module.css';

export const staticPages = {
  information: { path: '/information', title: 'Информация', label: 'Информация' },
  howTo: { path: '/how-to', title: 'Как продать/купить?', label: 'Как продать/купить?' },
  biddingGuide: { path: '/information/bidding-guide', title: 'Инструкция по участию в торгах', label: 'Инструкция по участию в торгах' },
  sellerGuide: { path: '/information/seller-guide', title: 'Инструкция по созданию своего аукциона', label: 'Инструкция по созданию аукциона' },
  userAgreement: { path: '/information/user-agreement', title: 'Пользовательское соглашение', label: 'Пользовательское соглашение' },
  privacyPolicy: { path: '/information/privacy-policy', title: 'Политика обработки персональных данных', label: 'Политика персональных данных' },
  payment: { path: '/information/payment', title: 'Оплата', label: 'Оплата' },
  company: { path: '/company', title: 'О компании', label: 'О компании' },
  contacts: { path: '/contacts', title: 'Контакты', label: 'Контакты' },
  support: { path: '/support', title: 'Связаться со службой поддержки', label: 'Служба поддержки' }
};

export const staticPagesByPath = Object.entries(staticPages).reduce((acc, [slug, page]) => {
  acc[page.path] = { ...page, slug };
  return acc;
}, {});

const infoCards = [
  { slug: 'biddingGuide', icon: HelpCircle, title: 'Участие в торгах', text: 'Подача заявки, внесение задатка, ставки, победа и оплата лота.' },
  { slug: 'sellerGuide', icon: FileText, title: 'Создание аукциона', text: 'Подготовка лота, заполнение формы, модерация и публикация.' },
  { slug: 'payment', icon: CreditCard, title: 'Оплата', text: 'Задаток, оплата выигранного лота, комиссия площадки и возврат задатков.' },
  { slug: 'userAgreement', icon: ShieldCheck, title: 'Пользовательское соглашение', text: 'Правила работы на площадке и обязанности участников.' },
  { slug: 'privacyPolicy', icon: ShieldCheck, title: 'Персональные данные', text: 'Порядок обработки пользовательской информации и документов.' },
  { slug: 'contacts', icon: Mail, title: 'Контакты', text: 'Реквизиты оператора, адрес, телефон и способы связи.' }
];

const buyerSteps = [
  'Зарегистрируйтесь, подтвердите email и пройдите верификацию в личном кабинете.',
  'Найдите аукцион в каталоге, изучите условия, фотографии, характеристики лота и сроки торгов.',
  'Подайте заявку на участие в период приема заявок и внесите задаток банковской картой.',
  'После допуска к торгам получите уникальный номер участника, который используется в ходе аукциона.',
  'Участвуйте в торгах: делайте ставки на повышение либо первым принимайте текущую цену в аукционе на понижение.',
  'При победе оплатите лот за вычетом внесенного задатка и свяжитесь с продавцом через чат сделки.'
];

const sellerSteps = [
  'Пройдите верификацию, чтобы получить право создавать аукционы и публиковать лоты.',
  'Заполните карточку лота: название, описание, категорию, характеристики, фотографии, адрес и условия осмотра.',
  'Укажите тип аукциона, цену, задаток, даты приема заявок и время проведения торгов.',
  'Сохраните черновик или сразу отправьте заявку на модерацию.',
  'После одобрения модератором аукцион публикуется в каталоге и получает номер.',
  'После завершения торгов подпишите протокол и договор купли-продажи с победителем.'
];

const paymentRules = [
  ['Задаток', 'Вносится после подачи заявки. Если задаток не оплачен до окончания приема заявок, заявка аннулируется.'],
  ['Оплата лота', 'Победитель оплачивает стоимость выигранного лота за вычетом ранее внесенного задатка.'],
  ['Комиссия площадки', 'При расчете цены показывается комиссия оператора торгов. Итоговые суммы фиксируются в протоколе.'],
  ['Возврат задатков', 'Задатки участников, не победивших в торгах, подлежат возврату после завершения аукциона.']
];

function PageHero({ title, text }) {
  return (
    <header className={styles.staticHero}>
      <h1>{title}</h1>
      {text && <p>{text}</p>}
    </header>
  );
}

function LinkCard({ page, onNavigate }) {
  const Icon = page.icon;
  return (
    <button className={styles.infoCard} type="button" onClick={() => onNavigate('static', { slug: page.slug })}>
      <Icon size={24} />
      <strong>{page.title}</strong>
      <span>{page.text}</span>
      <ArrowRight size={18} />
    </button>
  );
}

function StepList({ items }) {
  return (
    <ol className={styles.stepList}>
      {items.map((item) => (
        <li key={item}>
          <span />
          <p>{item}</p>
        </li>
      ))}
    </ol>
  );
}

function InfoCenter({ onNavigate }) {
  return (
    <>
      <PageHero
        title="Информационный центр"
        text="Здесь собраны правила работы площадки, инструкции для участников торгов, порядок оплаты, сведения об операторе и контакты службы поддержки."
      />
      <section className={styles.infoGrid}>
        {infoCards.map((card) => (
          <LinkCard key={card.slug} page={card} onNavigate={onNavigate} />
        ))}
      </section>
    </>
  );
}

function HowToPage({ onNavigate }) {
  return (
    <>
      <PageHero
        title="Как продать или купить имущество на Auction.by"
        text="Площадка позволяет пользователю выступать как покупателем, так и продавцом. Основные сценарии разделены на участие в торгах и создание собственного аукциона."
      />
      <div className={styles.twoColumns}>
        <section className={styles.staticCard}>
          <h2>Покупателю</h2>
          <p>Если нужно приобрести имущество, начните с каталога и внимательно изучите условия выбранного аукциона.</p>
          <StepList items={buyerSteps} />
          <button className={styles.linkButton} type="button" onClick={() => onNavigate('static', { slug: 'biddingGuide' })}>
            Открыть подробную инструкцию
          </button>
        </section>
        <section className={styles.staticCard}>
          <h2>Продавцу</h2>
          <p>Если нужно выставить имущество на продажу, подготовьте описание лота и документы для проверки модератором.</p>
          <StepList items={sellerSteps} />
          <button className={styles.linkButton} type="button" onClick={() => onNavigate('static', { slug: 'sellerGuide' })}>
            Открыть подробную инструкцию
          </button>
        </section>
      </div>
    </>
  );
}

function BiddingGuidePage() {
  return (
    <>
      <PageHero
        title="Инструкция по участию в торгах"
        text="Участие доступно зарегистрированным и верифицированным пользователям. Заявка подается в период приема заявок, после чего необходимо оплатить задаток."
      />
      <section className={styles.staticCard}>
        <h2>Порядок участия</h2>
        <StepList items={buyerSteps} />
      </section>
      <section className={styles.staticCard}>
        <h2>Особенности торгов</h2>
        <p>В аукционе на повышение участники делают ставки выше текущей цены с учетом минимального шага. Если ставка сделана в последние десять минут, торги продлеваются на десять минут.</p>
        <p>В аукционе на понижение цена автоматически уменьшается от начальной до минимальной по заранее рассчитанным шагам. Побеждает первый участник, который принимает текущую цену.</p>
        <p>После завершения торгов система формирует протокол результатов электронных торгов. Документ доступен на странице аукциона.</p>
      </section>
    </>
  );
}

function SellerGuidePage() {
  return (
    <>
      <PageHero
        title="Инструкция по созданию своего аукциона"
        text="Создание аукциона начинается с черновика. Пользователь может постепенно заполнить данные, сохранить форму и отправить ее на модерацию после подготовки."
      />
      <section className={styles.staticCard}>
        <h2>Подготовка аукциона</h2>
        <StepList items={sellerSteps} />
      </section>
      <section className={styles.staticCard}>
        <h2>Что проверяет модератор</h2>
        <p>Модератор оценивает полноту описания, корректность категории, качество фотографий, соответствие адреса и условий осмотра, а также прозрачность ценовых параметров и сроков торгов.</p>
        <p>Если данные требуют уточнения, заявка возвращается на доработку с причиной отказа. После исправления пользователь может повторно отправить аукцион на проверку.</p>
      </section>
    </>
  );
}

function UserAgreementPage() {
  return (
    <>
      <PageHero title="Пользовательское соглашение" text="Соглашение определяет общие правила использования интернет-сайта Auction.by." />
      <section className={styles.staticCard}>
        <h2>Основные положения</h2>
        <p>Пользователь обязуется предоставлять достоверные сведения при регистрации, верификации, создании аукционов и участии в торгах. Использование чужих данных, искажение сведений о лоте и действия, направленные на нарушение хода торгов, не допускаются.</p>
        <p>Оператор обеспечивает техническую работу площадки, хранение данных, отображение опубликованных аукционов, прием заявок, фиксацию ставок, формирование протоколов и предоставление инструментов связи между продавцом и победителем.</p>
        <p>Продавец отвечает за достоверность сведений о предмете торгов, готовность передать лот победителю и заключить договор купли-продажи. Покупатель отвечает за своевременную оплату задатка и выигранного лота.</p>
      </section>
    </>
  );
}

function PrivacyPolicyPage() {
  return (
    <>
      <PageHero title="Политика обработки персональных данных" text="Документ описывает, какие данные обрабатываются площадкой и для каких целей они используются." />
      <section className={styles.staticCard}>
        <h2>Обрабатываемые данные</h2>
        <p>Площадка обрабатывает регистрационные данные, сведения из заявок на верификацию, контактную информацию, документы, данные о созданных аукционах, заявках на участие, платежных сценариях, ставках, сообщениях в чатах сделок и уведомлениях.</p>
        <p>Данные используются для идентификации пользователя, проверки права участия в торгах, публикации аукционов, исполнения обязанностей оператора, формирования протоколов и обеспечения связи между сторонами сделки.</p>
        <p>Доступ к персональным данным ограничивается ролью пользователя. Модераторы и администраторы получают доступ только к сведениям, необходимым для проверки заявок и сопровождения торгов.</p>
      </section>
    </>
  );
}

function PaymentPage() {
  return (
    <>
      <PageHero title="Оплата" text="На площадке предусмотрены сценарии оплаты задатка и оплаты выигранного лота. В демонстрационном режиме платежи выполняются через имитацию банковской операции." />
      <section className={styles.staticCard}>
        <h2>Платежные правила</h2>
        <div className={styles.infoTable}>
          {paymentRules.map(([label, value]) => (
            <React.Fragment key={label}>
              <strong>{label}</strong>
              <span>{value}</span>
            </React.Fragment>
          ))}
        </div>
      </section>
    </>
  );
}

function CompanyPage() {
  return (
    <>
      <PageHero title="О компании" text="Оператором электронной площадки Auction.by является закрытое акционерное общество БасТорг." />
      <section className={styles.staticCard}>
        <h2>Сведения об операторе торгов</h2>
        <div className={styles.infoTable}>
          <strong>Наименование</strong><span>Закрытое акционерное общество "БасТорг"</span>
          <strong>Контактное лицо</strong><span>Бас Михаил Андреевич</span>
          <strong>Адрес</strong><span>г. Минск, ул. Калиновского, 79</span>
          <strong>Телефон</strong><span>+375292336767</span>
          <strong>Email</strong><span>miha@gmail.com</span>
          <strong>УНП</strong><span>192822249</span>
        </div>
      </section>
    </>
  );
}

function ContactsPage({ onNavigate }) {
  return (
    <>
      <PageHero title="Контакты" text="Свяжитесь с оператором торгов по организационным, техническим и платежным вопросам." />
      <div className={styles.twoColumns}>
        <section className={styles.staticCard}>
          <h2>Оператор торгов</h2>
          <p><MapPin size={18} /> г. Минск, ул. Калиновского, 79</p>
          <p><Phone size={18} /> +375292336767</p>
          <p><Mail size={18} /> miha@gmail.com</p>
        </section>
        <section className={styles.staticCard}>
          <h2>Служба поддержки</h2>
          <p>Если возникла проблема с регистрацией, верификацией, заявкой, оплатой или торгами, отправьте обращение через форму поддержки.</p>
          <button className={styles.linkButton} type="button" onClick={() => onNavigate('static', { slug: 'support' })}>
            Связаться со службой поддержки
          </button>
        </section>
      </div>
    </>
  );
}

function SupportPage() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: '' }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setErrors({});

    try {
      await apiRequest('/support/contact', {
        method: 'POST',
        body: JSON.stringify(form)
      });
      toast.success('Обращение отправлено в службу поддержки');
      setForm({ name: '', email: '', subject: '', message: '' });
    } catch (error) {
      setErrors(error.errors || {});
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PageHero title="Связаться со службой поддержки" text="Опишите проблему, укажите контактный email и тему обращения. Ответ будет направлен на указанную почту." />
      <form className={styles.supportForm} onSubmit={submit}>
        <label>
          <span>Ваше имя</span>
          <input value={form.name} onChange={(event) => updateField('name', event.target.value)} placeholder="Иван Иванов" />
          {errors.name && <small>{errors.name}</small>}
        </label>
        <label>
          <span>Email для ответа</span>
          <input type="email" value={form.email} onChange={(event) => updateField('email', event.target.value)} placeholder="user@example.com" />
          {errors.email && <small>{errors.email}</small>}
        </label>
        <label className={styles.supportForm__wide}>
          <span>Тема обращения</span>
          <input value={form.subject} onChange={(event) => updateField('subject', event.target.value)} placeholder="Например, вопрос по оплате задатка" />
          {errors.subject && <small>{errors.subject}</small>}
        </label>
        <label className={styles.supportForm__wide}>
          <span>Сообщение</span>
          <textarea value={form.message} onChange={(event) => updateField('message', event.target.value)} placeholder="Опишите ситуацию и укажите номер аукциона, если он есть" rows={7} />
          {errors.message && <small>{errors.message}</small>}
        </label>
        <button className={styles.submitButton} type="submit" disabled={loading}>
          {loading ? 'Отправляем...' : 'Отправить обращение'}
        </button>
      </form>
    </>
  );
}

function StaticInfoPage({ slug = 'information', onNavigate }) {
  const page = staticPages[slug] || staticPages.information;
  const content = useMemo(() => {
    if (slug === 'howTo') return <HowToPage onNavigate={onNavigate} />;
    if (slug === 'biddingGuide') return <BiddingGuidePage />;
    if (slug === 'sellerGuide') return <SellerGuidePage />;
    if (slug === 'userAgreement') return <UserAgreementPage />;
    if (slug === 'privacyPolicy') return <PrivacyPolicyPage />;
    if (slug === 'payment') return <PaymentPage />;
    if (slug === 'company') return <CompanyPage />;
    if (slug === 'contacts') return <ContactsPage onNavigate={onNavigate} />;
    if (slug === 'support') return <SupportPage />;
    return <InfoCenter onNavigate={onNavigate} />;
  }, [onNavigate, slug]);

  return (
    <div className={styles.staticPage} data-page-title={page.title}>
      {content}
    </div>
  );
}

export default StaticInfoPage;
