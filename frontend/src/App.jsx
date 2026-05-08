import { useSelector } from 'react-redux';
import styles from './App.module.css';

function App() {
  const projectStage = useSelector((state) => state.app.projectStage);

  return (
    <main className={styles.app}>
      <section className={styles.app__shell}>
        <div className={styles.app__content}>
          <p className={styles.app__eyebrow}>Auction.by</p>
          <h1 className={styles.app__title}>Платформа онлайн-аукционов</h1>
          <p className={styles.app__text}>
            Пользователи создают аукционы, модераторы проверяют лоты, участники
            подают заявки, вносят задаток и делают ставки в режиме онлайн.
          </p>
          <div className={styles.app__status}>
            <span className={styles.app__statusLabel}>Текущий этап</span>
            <strong className={styles.app__statusValue}>{projectStage}</strong>
          </div>
        </div>
      </section>
    </main>
  );
}

export default App;
