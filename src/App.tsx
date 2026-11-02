import { useState } from 'react'
import {
  ArrowRight, CalendarDays, Users, Sprout, HeartHandshake, Menu,
  X, MapPin, Sparkles, ShieldCheck, ChevronRight, CircleUserRound
} from 'lucide-react'

type Section = 'Главная' | 'Афиша' | 'Сообщества' | 'Развитие' | 'О центре'

const nav: Section[] = ['Главная', 'Афиша', 'Сообщества', 'Развитие', 'О центре']

const features = [
  { icon: CalendarDays, title: 'Афиша событий', text: 'Встречи, мастер-классы, занятия и события центра.', tone: 'lavender' },
  { icon: Users, title: 'Клубы и сообщества', text: 'Места, где можно найти близких по духу людей.', tone: 'sage' },
  { icon: Sprout, title: 'Развитие', text: 'Обучение, новые навыки и бережное движение к своим целям.', tone: 'peach' },
  { icon: HeartHandshake, title: 'Команда центра', text: 'Люди, которые создают пространство и наполняют его смыслом.', tone: 'blue' },
]

const principles = [
  { icon: HeartHandshake, title: 'Бережно', text: 'Уважаем границы, выбор и индивидуальный темп каждого человека.' },
  { icon: ShieldCheck, title: 'Безопасно', text: 'Заботимся о приватности и понятных правилах взаимодействия.' },
  { icon: Sparkles, title: 'С интересом', text: 'Создаём возможности пробовать новое, встречаться и развиваться.' },
]

export default function App() {
  const [active, setActive] = useState<Section>('Главная')
  const [menuOpen, setMenuOpen] = useState(false)
  const [notice, setNotice] = useState('')

  const choose = (item: Section) => {
    setActive(item)
    setMenuOpen(false)
    if (item !== 'Главная') setNotice(`Раздел «${item}» подготовлен к наполнению на следующем этапе.`)
    else setNotice('')
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <a className="brand" href="#top" onClick={() => choose('Главная')} aria-label="Центр Притяжения — главная">
          <span className="brand-mark"><span /></span>
          <span className="brand-copy"><strong>Центр Притяжения</strong><small>Пространство для жизни и развития</small></span>
        </a>
        <nav className="desktop-nav" aria-label="Основная навигация">
          {nav.map(item => <button key={item} className={active === item ? 'nav-link active' : 'nav-link'} onClick={() => choose(item)}>{item}</button>)}
        </nav>
        <button className="profile-button" onClick={() => setNotice('Личный кабинет появится на следующем этапе. Пока можно знакомиться с центром без регистрации.')}><CircleUserRound size={18} /><span>Моё пространство</span></button>
        <button className="mobile-menu-button" aria-label={menuOpen ? 'Закрыть меню' : 'Открыть меню'} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X /> : <Menu />}</button>
      </header>

      {menuOpen && <nav className="mobile-nav">{nav.map(item => <button key={item} onClick={() => choose(item)}>{item}<ChevronRight size={17} /></button>)}</nav>}

      <main id="top">
        <section className="hero">
          <div className="hero-orb orb-one" /><div className="hero-orb orb-two" />
          <div className="hero-content">
            <div className="eyebrow"><span className="eyebrow-dot" /> АСБЕСТ · ПРОСТРАНСТВО ВСТРЕЧ И ВОЗМОЖНОСТЕЙ</div>
            <h1>Здесь начинается<br /><em>то, что важно</em><br />именно тебе.</h1>
            <p className="hero-lead">Место, где можно быть собой, встретить близких по духу людей, открыть новое и двигаться вперёд в своём темпе.</p>
            <div className="hero-actions">
              <button className="button-primary" onClick={() => choose('Афиша')}>Открыть афишу <ArrowRight size={17} /></button>
              <button className="button-quiet" onClick={() => choose('О центре')}>Познакомиться с центром</button>
            </div>
            <div className="hero-note"><HeartHandshake size={17} /><span>Без оценок и спешки. С уважением к каждому.</span></div>
          </div>
          <div className="hero-art" aria-label="Абстрактная композиция из мягких цветовых форм">
            <div className="art-ring ring-a" /><div className="art-ring ring-b" />
            <div className="art-shape shape-a" /><div className="art-shape shape-b" /><div className="art-shape shape-c" />
            <div className="art-center"><span className="brand-mark large"><span /></span><strong>Место,<br />где встречаются<br />возможности</strong><small>ЦЕНТР ПРИТЯЖЕНИЯ</small></div>
            <span className="art-caption caption-a">тепло</span><span className="art-caption caption-b">доверие</span><span className="art-caption caption-c">развитие</span>
          </div>
        </section>

        {notice && <div className="notice" role="status">{notice}<button onClick={() => setNotice('')} aria-label="Закрыть уведомление"><X size={16} /></button></div>}

        <section className="intro-section section-wrap">
          <div className="section-kicker">РАДЫ ТЕБЯ ВИДЕТЬ</div>
          <div className="intro-grid"><h2>Не просто место.<br /><em>Люди и возможности.</em></h2><p>«Центр Притяжения» объединяет тех, кому важно общение, развитие, творчество и поддержка. Здесь рождаются идеи, складываются знакомства и появляются новые маршруты.</p></div>
        </section>

        <section className="features-section section-wrap">
          <div className="section-heading"><div><div className="section-kicker">ОТКРЫВАЙ СВОЁ</div><h2>Что тебя притягивает?</h2></div><span className="heading-aside">Выбирай то, что откликается.<br />Можно начать с малого.</span></div>
          <div className="feature-grid">{features.map(({ icon: Icon, title, text, tone }) => <button className={`feature-card ${tone}`} key={title} onClick={() => setNotice(`Раздел «${title}» будет наполнен подробной информацией на следующем этапе.`)}><span className="feature-icon"><Icon size={22} strokeWidth={1.7} /></span><span className="feature-title">{title}</span><span className="feature-text">{text}</span><span className="feature-arrow"><ArrowRight size={18} /></span></button>)}</div>
        </section>

        <section className="values-section">
          <div className="section-wrap values-inner">
            <div className="values-heading"><div className="section-kicker">НАШИ ОРИЕНТИРЫ</div><h2>Пространство,<br /><em>в котором бережно.</em></h2><p>Для нас важно не только то, что происходит, но и то, как человек себя при этом чувствует.</p></div>
            <div className="values-list">{principles.map(({ icon: Icon, title, text }, i) => <div className="value-item" key={title}><span className="value-number">0{i + 1}</span><span className="value-icon"><Icon size={21} /></span><div><h3>{title}</h3><p>{text}</p></div></div>)}</div>
          </div>
        </section>

        <section className="invitation section-wrap">
          <div className="invitation-card"><div className="invitation-mark"><Sparkles size={24} /></div><div><div className="section-kicker">ТВОЙ ПУТЬ МОЖЕТ НАЧАТЬСЯ ЗДЕСЬ</div><h2>Не обязательно знать,<br /><em>с чего начать.</em></h2><p>Можно просто познакомиться с нами. Посмотреть направления, выбрать встречу или задать вопрос.</p></div><button className="button-primary" onClick={() => setNotice('Контакты и способы связи добавим после согласования актуальных данных центра.')}>Связаться с центром <ArrowRight size={17} /></button></div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="footer-top"><a className="brand footer-brand" href="#top"><span className="brand-mark"><span /></span><span className="brand-copy"><strong>Центр Притяжения</strong><small>Притягиваем возможности. Вдохновляем на рост.</small></span></a><div className="footer-location"><MapPin size={17} /> Асбест, Свердловская область</div></div>
        <div className="footer-bottom"><span>© Центр Притяжения</span><span>Тепло. Доверие. Развитие.</span><span>Сделано с заботой о людях</span></div>
      </footer>
    </div>
  )
}