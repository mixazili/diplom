ТЗ AUCTION.BY
ТЕМА ДИПЛОМА: ВЕБ-ПРИЛОЖЕНИЕ ДЛЯ ПРОВЕДЕНИЯ ОНЛАЙН-АУКЦИОНОВ

1. Общие сведения

Разработать веб-приложение Auction.by — платформу для создания, модерации и проведения онлайн-аукционов.
Основной сценарий проекта: обычные пользователи – физ лица, юр лица или индивидуальные предпрениматели, регистрируются, самостоятельно создают аукционы, после чего модераторы проверяют верификационные данные, лоты и либо публикуют их, либо возвращают пользователю на доработку с понятной причиной. После публикации лот становится доступен в каталоге, пользователи могут подать заявку на участие, оплатить задаток, быть допущенными к торгам и делать ставки в режиме онлайн.
Проект не должен быть интернет-магазином. Никаких фиксированных покупок “добавить в корзину” и обычного checkout-магазина делать не надо. В системе есть только аукционы, заявки на участие, задатки, ставки, победитель и последующее оформление сделки.

## Этап 1. Архитектура, структура проекта и подключение MongoDB Atlas

### What was implemented

Создан базовый каркас Auction.by по стеку из ТЗ:

- Backend: Node.js + Express, REST API, базовая структура `config/controllers/middleware/models/routes`.
- Database: MongoDB Atlas через mongoose, отдельные URI для development, test и production.
- Auth foundation: добавлены env-настройки для JWT access и refresh tokens.
- Models foundation: `User`, `Auction`, `AuctionApplication`, `Bid`, `Deposit`.
- Tests backend: Jest + Supertest, базовые тесты health endpoint и 404 handler.
- Frontend: React + Redux без TypeScript, Vite, CSS Modules, БЭМ-нейминг, цвета через CSS-переменные.

### Changed files

- `.gitignore`
- `.env.example`
- `package.json`
- `package-lock.json`
- `backend/src/app.js`
- `backend/src/server.js`
- `backend/src/config/env.js`
- `backend/src/config/database.js`
- `backend/src/controllers/healthController.js`
- `backend/src/middleware/errorMiddleware.js`
- `backend/src/models/User.js`
- `backend/src/models/Auction.js`
- `backend/src/models/AuctionApplication.js`
- `backend/src/models/Bid.js`
- `backend/src/models/Deposit.js`
- `backend/src/routes/index.js`
- `backend/src/routes/healthRoutes.js`
- `backend/tests/health.test.js`
- `backend/tests/notFound.test.js`
- `frontend/index.html`
- `frontend/src/main.jsx`
- `frontend/src/App.jsx`
- `frontend/src/App.module.css`
- `frontend/src/store/index.js`
- `frontend/src/features/app/appSlice.js`
- `frontend/src/styles/global.css`

### Tests

- `npm test` - passed, 2 test suites, 2 tests.
- `npm run build` - passed, frontend production build completed with Vite 6.4.2.
- `npm audit --audit-level=moderate` - passed, 0 vulnerabilities.
- MongoDB Atlas connection check:
  - development: connected to `auction_by_dev`;
  - test: connected to `auction_by_test`;
  - production: connected to `auction_by`.

### How to check all logic manually

1. Create local `.env` from `.env.example` and set MongoDB Atlas credentials.
2. Run `npm install --legacy-peer-deps`.
3. Run `npm test`.
4. Run `npm run build`.
5. Run `npm start`.
6. Open `http://127.0.0.1:5055/api/health` and check that response contains `status: "ok"` and database status `connected`.

### Notes

- Real MongoDB credentials are stored only in local `.env`, which is ignored by git.
- `vite` is pinned to `6.4.2`: `vite@8` failed on Windows with a native `rolldown` binding error, while older Vite 5 had an esbuild audit finding.
- The project remains an auction platform foundation only: no shop, cart, fixed purchase, or checkout logic was added.

## Этап 2. Регистрация, вход и пользовательская верификация

### What was implemented

Реализован пользовательский auth-flow и отправка заявки на верификацию:

- Регистрация пользователя через email и пароль без выбора типа аккаунта на этом шаге.
- Подтверждение email шестизначным кодом, отправляемым через Nodemailer.
- Для разработки используется Ethereal, ссылка на письмо возвращается в dev-ответе и логируется backend.
- Вход только после подтверждения email.
- JWT access + refresh tokens, хранение hash refresh token у пользователя.
- Роли заложены как `admin`, `moderator`, `user`; `guest` остаётся неавторизованным пользователем.
- Пользователь после регистрации имеет почти гостевой статус до прохождения верификации.
- В личном кабинете добавлена форма верификации для:
  - физического лица, резидента РБ;
  - физического лица, нерезидента РБ;
  - юридического лица, резидента РБ;
  - юридического лица, нерезидента РБ;
  - индивидуального предпринимателя, резидента РБ;
  - индивидуального предпринимателя, нерезидента РБ.
- Для физического лица добавлен выбор документа: паспорт, ID-карта, вид на жительство.
- Для ID-карты скрывается поле "Кем выдан".
- Для нерезидентов скрывается поле "Срок действия".
- Для нерезидентов физлиц и ИП добавлено поле "Личный номер".
- Для всех форм верификации добавлен блок согласий на обработку персональных данных и подтверждение достоверности данных.
- Банковские реквизиты разделены на отдельные поля: название банка, УНП банка, BIC, IBAN, адрес банка; для нерезидентов дополнительно добавлены транзитный банк, BIC транзитного банка и транзитный счёт.
- Для физлиц и ИП добавлены 4 слота загрузки документов с точными подписями под паспорт/ID-карту; обязательными остаются основные 2 документа.
- Документы отправляются как реальные файлы через `multipart/form-data` и сохраняются в `backend/uploads/verification`.
- После отправки заявки пользователь получает `verificationStatus: pending`.
- Модераторская и админская проверка не реализовывались, это следующий этап.

### Changed files

- `.gitignore`
- `.env.example`
- `package.json`
- `package-lock.json`
- `backend/src/config/env.js`
- `backend/src/controllers/authController.js`
- `backend/src/controllers/verificationController.js`
- `backend/src/middleware/authMiddleware.js`
- `backend/src/middleware/uploadMiddleware.js`
- `backend/src/models/User.js`
- `backend/src/models/VerificationRequest.js`
- `backend/src/routes/authRoutes.js`
- `backend/src/routes/index.js`
- `backend/src/routes/verificationRoutes.js`
- `backend/src/services/authService.js`
- `backend/src/services/emailService.js`
- `backend/src/services/tokenService.js`
- `backend/src/utils/asyncHandler.js`
- `backend/src/utils/authValidation.js`
- `backend/src/utils/verificationValidation.js`
- `backend/tests/auth.test.js`
- `backend/tests/setup.js`
- `backend/tests/verification.test.js`
- `frontend/vite.config.js`
- `frontend/src/api/client.js`
- `frontend/src/App.jsx`
- `frontend/src/App.module.css`
- `frontend/src/features/app/appSlice.js`
- `frontend/src/features/auth/authSlice.js`
- `frontend/src/features/verification/verificationSlice.js`
- `frontend/src/store/index.js`
- `frontend/src/styles/global.css`

### Tests

- `npm test` - passed, 4 test suites, 7 tests.
- `npm run build` - passed, frontend production build completed.
- `npm audit --audit-level=moderate` - passed, 0 vulnerabilities.
- API boot check passed: `GET /api/health` returns `status: "ok"` and connected MongoDB Atlas development database.

### How to check all logic manually

1. Run `npm install`.
2. Run `npm run dev`.
3. Open `http://127.0.0.1:5173`.
4. Register with email and password.
5. Open the Ethereal preview link from the API response/backend console and copy the confirmation code.
6. Enter the code in the frontend form.
7. Log in if needed.
8. In the cabinet choose account type and resident/non-resident status.
9. Fill required fields, upload jpg/jpeg/png/pdf documents and submit the verification form.
10. Check that the user status becomes `pending`.

### Notes

- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` are optional for now; if they are empty, Nodemailer creates an Ethereal test mailbox.
- Uploaded verification documents are ignored by git through `backend/uploads/`.
- The frontend uses root `vite.config.js`: fixed port `http://127.0.0.1:5173`, `strictPort: true`, and proxy for `/api` requests to `http://127.0.0.1:5055`.
- No shop/cart/checkout logic was added.
