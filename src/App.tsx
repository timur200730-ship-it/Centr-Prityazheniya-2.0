import { useState, useEffect, type FormEvent } from 'react'
import { supabase } from './lib/supabase'
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
  const [user, setUser] = useState<import('@supabase/supabase-js').User | null>(null)
  const [authOpen, setAuthOpen] = useState(false)
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'reset'>('login')
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authPasswordConfirm, setAuthPasswordConfirm] = useState('')
  const [authDisplayName, setAuthDisplayName] = useState('')
  const [authBusy, setAuthBusy] = useState(false)
  const [authMessage, setAuthMessage] = useState('')
  const [authError, setAuthError] = useState('')

  useEffect(() => {
    if (!supabase) return
    let mounted = true
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (mounted) setUser(session?.user ?? null)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const openAuth = (mode: 'login' | 'register' | 'reset' = 'login') => {
    setAuthMode(mode)
    setAuthMessage('')
    setAuthError('')
    setAuthOpen(true)
    setNotice('')
  }

  const handleAuthSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setAuthError('')
    setAuthMessage('')
    if (!supabase) {
      setAuthError('Авторизация пока не настроена. Проверьте подключение Supabase.')
      return
    }
    if (authMode === 'register' && authPassword !== authPasswordConfirm) {
      setAuthError('Пароли не совпадают.')
      return
    }
    setAuthBusy(true)
    try {
      if (authMode === 'register') {
        const { data, error } = await supabase.auth.signUp({
          email: authEmail.trim(),
          password: authPassword,
          options: {
            data: { display_name: authDisplayName.trim() || 'Участник' },
            emailRedirectTo: `${window.location.origin}/`,
          },
        })
        if (error) throw error
        if (data.session) {
          setUser(data.user)
          setAuthOpen(false)
          setNotice('Регистрация завершена. Добро пожаловать в Центр Притяжения!')
        } else {
          setAuthMessage('Проверьте почту и подтвердите адрес электронной почты, чтобы завершить регистрацию.')
        }
      } else if (authMode === 'login') {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: authEmail.trim(),
          password: authPassword,
        })
        if (error) throw error
        setUser(data.user)
        setAuthOpen(false)
        setNotice('Вы вошли в Центр Притяжения. Личный кабинет будет следующим этапом.')
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(authEmail.trim(), {
          redirectTo: window.location.origin,
        })
        if (error) throw error
        setAuthMessage('Если аккаунт с таким адресом существует, письмо для восстановления будет отправлено. Проверьте почту.')
      }
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Не удалось выполнить запрос. Попробуйте ещё раз.')
    } finally {
      setAuthBusy(false)
    }
  }

  const handleSignOut = async () => {
    if (!supabase) return
    const { error } = await supabase.auth.signOut()
    if (error) {
      setNotice('Не удалось завершить сеанс. Попробуйте ещё раз.')
      return
    }
    setUser(null)
    setNotice('Вы вышли из аккаунта.')
  }

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
        <button className="profile-button" onClick={() => user ? setNotice(`Вы вошли как ${user.email ?? 'участник'}. Личный кабинет будет следующим этапом.`) : openAuth('login')}><CircleUserRound size={18} /><span>{user ? 'Мой аккаунт' : 'Моё пространство'}</span></button>
        <button className="mobile-menu-button" aria-label={menuOpen ? 'Закрыть меню' : 'Открыть меню'} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X /> : <Menu />}</button>
      </header>

      {menuOpen && <nav className="mobile-nav">{nav.map(item => <button key={item} onClick={() => choose(item)}>{item}<ChevronRight size={17} /></button>)}<button className="mobile-account-link" onClick={() => { setMenuOpen(false); user ? setNotice(`Вы вошли как ${user.email ?? "участник"}. Личный кабинет будет следующим этапом.`) : openAuth("login") }}><CircleUserRound size={17} />{user ? "Мой аккаунт" : "Моё пространство"}<ChevronRight size={17} /></button></nav>}

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

        {notice && <div className="notice" role="status"><span>{notice}</span><div className="notice-actions">{user && <button className="notice-signout" onClick={handleSignOut}>Выйти</button>}<button onClick={() => setNotice('')} aria-label="Закрыть уведомление"><X size={16} /></button></div></div>}

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

      {authOpen && (
        <div className="auth-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setAuthOpen(false)
        }}>
          <section className="auth-modal" role="dialog" aria-modal="true" aria-labelledby="auth-title">
            <button className="auth-close" type="button" onClick={() => setAuthOpen(false)} aria-label="Закрыть"><X size={19} /></button>
            <div className="auth-kicker">ЦЕНТР ПРИТЯЖЕНИЯ</div>
            <h2 id="auth-title">{authMode === 'register' ? 'Создать пространство' : authMode === 'reset' ? 'Восстановить доступ' : 'Рады снова видеть'}</h2>
            <p className="auth-description">{authMode === 'register' ? 'Присоединяйся к сообществу и открывай новые возможности.' : authMode === 'reset' ? 'Укажи почту, на которую зарегистрирован аккаунт.' : 'Войди, чтобы быть частью жизни центра.'}</p>
            <form className="auth-form" onSubmit={handleAuthSubmit}>
              {authMode === 'register' && <label>Как к тебе обращаться<input value={authDisplayName} onChange={(event) => setAuthDisplayName(event.target.value)} placeholder="Имя" autoComplete="name" /></label>}
              <label>Электронная почта<input type="email" required value={authEmail} onChange={(event) => setAuthEmail(event.target.value)} placeholder="name@example.com" autoComplete="email" /></label>
              {authMode !== 'reset' && <label>Пароль<input type="password" required minLength={6} value={authPassword} onChange={(event) => setAuthPassword(event.target.value)} placeholder="Не менее 6 символов" autoComplete={authMode === 'register' ? 'new-password' : 'current-password'} /></label>}
              {authMode === 'register' && <label>Повтори пароль<input type="password" required minLength={6} value={authPasswordConfirm} onChange={(event) => setAuthPasswordConfirm(event.target.value)} placeholder="Повтори пароль" autoComplete="new-password" /></label>}
              {authError && <div className="auth-feedback error" role="alert">{authError}</div>}
              {authMessage && <div className="auth-feedback success" role="status">{authMessage}</div>}
              <button className="button-primary auth-submit" type="submit" disabled={authBusy}>{authBusy ? 'Подожди…' : authMode === 'register' ? 'Зарегистрироваться' : authMode === 'reset' ? 'Отправить письмо' : 'Войти'} <ArrowRight size={17} /></button>
            </form>
            <div className="auth-switches">
              {authMode === 'login' && <>
                <button type="button" onClick={() => { setAuthMode('register'); setAuthMessage(''); setAuthError('') }}>Создать аккаунт</button>
                <button type="button" onClick={() => { setAuthMode('reset'); setAuthMessage(''); setAuthError('') }}>Забыли пароль?</button>
              </>}
              {authMode !== 'login' && <button type="button" onClick={() => { setAuthMode('login'); setAuthMessage(''); setAuthError('') }}>Вернуться ко входу</button>}
            </div>
            <p className="auth-footnote">Твои данные используются только для работы аккаунта и взаимодействия с центром.</p>
          </section>
        </div>
      )}
    </div>
  )
}