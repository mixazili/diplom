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
