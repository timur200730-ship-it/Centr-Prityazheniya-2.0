import { useState, useEffect, type FormEvent } from 'react'
import { supabase } from './lib/supabase'
import {
  ArrowRight, CalendarDays, Users, Sprout, HeartHandshake, Menu,
  X, MapPin, Sparkles, ShieldCheck, ChevronRight, CircleUserRound, Save, Mail, LogOut
} from 'lucide-react'

type Section = 'Главная' | 'Афиша' | 'Сообщества' | 'Развитие' | 'О центре'
type ProfileDraft = { display_name: string; bio: string; city: string; interests: string; visibility: 'community' | 'private' }
type EventItem = { id: string; title: string; description: string; starts_at: string; ends_at: string | null; location: string; capacity: number | null }
type ClubItem = { id: string; name: string; summary: string; description: string; city: string }
type ManagedEvent = { id: string; title: string; starts_at: string; location: string; status: 'draft' | 'published' | 'cancelled' }
type EventDraft = { title: string; description: string; starts_at: string; ends_at: string; location: string; capacity: string; status: 'draft' | 'published' }

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
  const [accountOpen, setAccountOpen] = useState(false)
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileError, setProfileError] = useState('')
  const [profileMessage, setProfileMessage] = useState('')
  const [accountRole, setAccountRole] = useState('Участник')
  const [profileDraft, setProfileDraft] = useState<ProfileDraft>({ display_name: '', bio: '', city: 'Асбест', interests: '', visibility: 'community' })
  const [events, setEvents] = useState<EventItem[]>([])
  const [clubs, setClubs] = useState<ClubItem[]>([])
  const [catalogLoading, setCatalogLoading] = useState(false)
  const [catalogError, setCatalogError] = useState('')
  const [myEventIds, setMyEventIds] = useState<string[]>([])
  const [myClubIds, setMyClubIds] = useState<string[]>([])
  const [actionBusy, setActionBusy] = useState<string | null>(null)
  const [managedEvents, setManagedEvents] = useState<ManagedEvent[]>([])
  const [eventSaving, setEventSaving] = useState(false)
  const [eventFormError, setEventFormError] = useState('')
  const [eventFormMessage, setEventFormMessage] = useState('')
  const [eventDraft, setEventDraft] = useState<EventDraft>({ title: '', description: '', starts_at: '', ends_at: '', location: 'Асбест', capacity: '', status: 'draft' })

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

  useEffect(() => {
    if (!supabase || !user) {
      setAccountRole('Участник')
      return
    }
    let active = true
    setProfileLoading(true)
    setProfileError('')
    Promise.all([
      supabase.from('profiles').select('display_name, bio, city, interests, visibility').eq('id', user.id).maybeSingle(),
      supabase.from('user_roles').select('role').eq('user_id', user.id),
    ]).then(([profileResult, rolesResult]) => {
      if (!active) return
      if (profileResult.error) {
        setProfileError('Не удалось загрузить профиль. Попробуй обновить страницу.')
      } else if (profileResult.data) {
        const p = profileResult.data
        setProfileDraft({
          display_name: p.display_name ?? '',
          bio: p.bio ?? '',
          city: p.city ?? 'Асбест',
          interests: Array.isArray(p.interests) ? p.interests.join(', ') : '',
          visibility: p.visibility === 'private' ? 'private' : 'community',
        })
      }
      const role = rolesResult.data?.[0]?.role
      const labels: Record<string, string> = {
        member: 'Участник',
        club_leader: 'Руководитель сообщества',
        organizer: 'Организатор',
        moderator: 'Модератор',
        administrator: 'Администратор',
        super_admin: 'Суперадминистратор',
      }
      setAccountRole(role ? (labels[role] ?? 'Участник') : 'Участник')
    }).catch(() => {
      if (active) setProfileError('Не удалось загрузить профиль. Проверь подключение и попробуй ещё раз.')
    }).finally(() => {
      if (active) setProfileLoading(false)
    })
    return () => { active = false }
  }, [user])

  useEffect(() => {
    const client = supabase
    if (!client || (active !== 'Афиша' && active !== 'Сообщества')) return
    let alive = true
    setCatalogLoading(true); setCatalogError('')
    const load = async () => {
      if (active === 'Афиша') {
        const { data, error } = await client.from('events').select('id, title, description, starts_at, ends_at, location, capacity').eq('status', 'published').gte('starts_at', new Date().toISOString()).order('starts_at', { ascending: true })
        if (error) throw error
        if (alive) setEvents((data ?? []) as EventItem[])
        if (user) { const { data: rows, error: e } = await client.from('event_registrations').select('event_id').eq('user_id', user.id).eq('status', 'registered'); if (e) throw e; if (alive) setMyEventIds((rows ?? []).map(row => row.event_id)) }
        else if (alive) setMyEventIds([])
      } else {
        const { data, error } = await client.from('clubs').select('id, name, summary, description, city').eq('status', 'published').order('name', { ascending: true })
        if (error) throw error
        if (alive) setClubs((data ?? []) as ClubItem[])
        if (user) { const { data: rows, error: e } = await client.from('club_memberships').select('club_id').eq('user_id', user.id).in('status', ['pending', 'active']); if (e) throw e; if (alive) setMyClubIds((rows ?? []).map(row => row.club_id)) }
        else if (alive) setMyClubIds([])
      }
    }
    load().catch(() => { if (alive) setCatalogError('Не удалось загрузить данные. Попробуй обновить страницу.') }).finally(() => { if (alive) setCatalogLoading(false) })
    return () => { alive = false }
  }, [active, user])

  const registerForEvent = async (eventId: string) => {
    if (!user || !supabase) { openAuth('login'); return }
    setActionBusy(eventId)
    const { error } = await supabase.from('event_registrations').insert({ event_id: eventId, user_id: user.id, status: 'registered' })
    if (error) setNotice(error.code === '23505' ? 'Ты уже записан на это мероприятие.' : 'Не удалось записаться. Возможно, регистрация уже закрыта.')
    else { setMyEventIds(current => [...current, eventId]); setNotice('Ты записан на мероприятие!') }
    setActionBusy(null)
  }

  const requestClubMembership = async (clubId: string) => {
    if (!user || !supabase) { openAuth('login'); return }
    setActionBusy(clubId)
    const { error } = await supabase.from('club_memberships').insert({ club_id: clubId, user_id: user.id, status: 'pending' })
    if (error) setNotice(error.code === '23505' ? 'Заявка в это сообщество уже отправлена.' : 'Не удалось отправить заявку. Попробуй позже.')
    else { setMyClubIds(current => [...current, clubId]); setNotice('Заявка отправлена. После рассмотрения появится статус участия.') }
    setActionBusy(null)
  }
  useEffect(() => {
    const client = supabase
    const canManage = ['Организатор', 'Модератор', 'Администратор', 'Суперадминистратор'].includes(accountRole)
    if (!client || !user || !accountOpen || !canManage) return
    let alive = true
    client.from('events').select('id, title, starts_at, location, status').eq('created_by', user.id).order('starts_at', { ascending: true })
      .then(({ data, error }) => {
        if (!alive) return
        if (error) setEventFormError('Не удалось загрузить твои мероприятия.')
        else setManagedEvents((data ?? []) as ManagedEvent[])
      })
    return () => { alive = false }
  }, [user, accountOpen, accountRole])

  const handleEventCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!supabase || !user) return
    setEventSaving(true); setEventFormError(''); setEventFormMessage('')
    const startsAt = new Date(eventDraft.starts_at)
    const endsAt = eventDraft.ends_at ? new Date(eventDraft.ends_at) : null
    if (!eventDraft.title.trim() || !eventDraft.starts_at || Number.isNaN(startsAt.getTime())) { setEventFormError('Укажи название и корректную дату начала.'); setEventSaving(false); return }
    if (endsAt && (Number.isNaN(endsAt.getTime()) || endsAt <= startsAt)) { setEventFormError('Время окончания должно быть позже начала.'); setEventSaving(false); return }
    const capacity = eventDraft.capacity.trim() ? Number(eventDraft.capacity) : null
    if (capacity !== null && (!Number.isInteger(capacity) || capacity < 1)) { setEventFormError('Количество мест должно быть целым числом больше нуля.'); setEventSaving(false); return }
    const { data, error } = await supabase.from('events').insert({ title: eventDraft.title.trim(), description: eventDraft.description.trim(), starts_at: startsAt.toISOString(), ends_at: endsAt?.toISOString() ?? null, location: eventDraft.location.trim(), capacity, status: eventDraft.status, created_by: user.id }).select('id, title, starts_at, location, status').single()
    if (error) setEventFormError('Не удалось сохранить мероприятие. Проверь права организатора и обязательные поля.')
    else if (data) { setManagedEvents(current => [...current, data as ManagedEvent].sort((a,b) => a.starts_at.localeCompare(b.starts_at))); setEventDraft({ title: '', description: '', starts_at: '', ends_at: '', location: 'Асбест', capacity: '', status: 'draft' }); setEventFormMessage(eventDraft.status === 'published' ? 'Мероприятие опубликовано и появится в афише.' : 'Черновик мероприятия сохранён.') }
    setEventSaving(false)
  }
  const handleProfileSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!supabase || !user) return
    setProfileSaving(true)
    setProfileError('')
    setProfileMessage('')
    const interests = profileDraft.interests.split(',').map(item => item.trim()).filter(Boolean)
    const { data, error } = await supabase.from('profiles').update({
      display_name: profileDraft.display_name.trim() || 'Участник',
      bio: profileDraft.bio.trim(),
      city: profileDraft.city.trim(),
      interests,
      visibility: profileDraft.visibility,
      updated_at: new Date().toISOString(),
    }).eq('id', user.id).select('display_name, bio, city, interests, visibility').single()
    if (error) {
      setProfileError('Не удалось сохранить изменения. Проверь подключение и попробуй ещё раз.')
    } else if (data) {
      setProfileDraft({
        display_name: data.display_name ?? '',
        bio: data.bio ?? '',
        city: data.city ?? '',
        interests: Array.isArray(data.interests) ? data.interests.join(', ') : '',
        visibility: data.visibility === 'private' ? 'private' : 'community',
      })
      setProfileMessage('Изменения профиля сохранены.')
    }
    setProfileSaving(false)
  }

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
        <button className="profile-button" onClick={() => user ? setAccountOpen(true) : openAuth('login')}><CircleUserRound size={18} /><span>{user ? 'Мой аккаунт' : 'Моё пространство'}</span></button>
        <button className="mobile-menu-button" aria-label={menuOpen ? 'Закрыть меню' : 'Открыть меню'} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X /> : <Menu />}</button>
      </header>

      {menuOpen && <nav className="mobile-nav">{nav.map(item => <button key={item} onClick={() => choose(item)}>{item}<ChevronRight size={17} /></button>)}<button className="mobile-account-link" onClick={() => { setMenuOpen(false); user ? setAccountOpen(true) : openAuth("login") }}><CircleUserRound size={17} />{user ? "Мой аккаунт" : "Моё пространство"}<ChevronRight size={17} /></button></nav>}

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

        {active === 'Афиша' && <section className="catalog-section section-wrap">
          <div className="section-kicker">ВСТРЕЧИ И СОБЫТИЯ</div><div className="catalog-heading"><div><h2>Афиша центра</h2><p>Выбирай то, что откликается, и присоединяйся.</p></div><span className="catalog-count">{events.length} событий</span></div>
          {catalogLoading ? <div className="catalog-empty">Загружаем афишу…</div> : catalogError ? <div className="catalog-empty">{catalogError}</div> : events.length === 0 ? <div className="catalog-empty"><CalendarDays size={28}/><strong>Скоро здесь появятся события</strong><span>Мы готовим программу встреч и мероприятий. Загляни чуть позже.</span></div> : <div className="catalog-grid">{events.map(item => <article className="catalog-card" key={item.id}><div className="catalog-card-top"><span className="catalog-tag">МЕРОПРИЯТИЕ</span><CalendarDays size={19}/></div><h3>{item.title}</h3><p>{item.description || 'Подробности мероприятия скоро появятся.'}</p><div className="catalog-meta"><span><CalendarDays size={15}/>{new Date(item.starts_at).toLocaleString('ru-RU', { dateStyle: 'medium', timeStyle: 'short' })}</span>{item.location && <span><MapPin size={15}/>{item.location}</span>}</div><button className="button-primary catalog-action" disabled={actionBusy === item.id || myEventIds.includes(item.id)} onClick={() => registerForEvent(item.id)}>{actionBusy === item.id ? 'Отправляем…' : myEventIds.includes(item.id) ? 'Ты записан' : 'Записаться'} {!myEventIds.includes(item.id) && <ArrowRight size={16}/>}</button></article>)}</div>}
        </section>}
        {active === 'Сообщества' && <section className="catalog-section section-wrap">
          <div className="section-kicker">ЛЮДИ ПО ИНТЕРЕСАМ</div><div className="catalog-heading"><div><h2>Сообщества</h2><p>Найди своё окружение или открой новое направление.</p></div><span className="catalog-count">{clubs.length} сообществ</span></div>
          {catalogLoading ? <div className="catalog-empty">Загружаем сообщества…</div> : catalogError ? <div className="catalog-empty">{catalogError}</div> : clubs.length === 0 ? <div className="catalog-empty"><Users size={28}/><strong>Сообщества скоро откроются</strong><span>Здесь появятся клубы, инициативы и группы по интересам.</span></div> : <div className="catalog-grid">{clubs.map(item => <article className="catalog-card club-card" key={item.id}><div className="catalog-card-top"><span className="catalog-tag">СООБЩЕСТВО</span><Users size={19}/></div><h3>{item.name}</h3><p>{item.summary || item.description || 'Описание сообщества скоро появится.'}</p><div className="catalog-meta"><span><MapPin size={15}/>{item.city || 'Асбест'}</span></div><button className="button-primary catalog-action" disabled={actionBusy === item.id || myClubIds.includes(item.id)} onClick={() => requestClubMembership(item.id)}>{actionBusy === item.id ? 'Отправляем…' : myClubIds.includes(item.id) ? 'Заявка отправлена' : 'Присоединиться'} {!myClubIds.includes(item.id) && <ArrowRight size={16}/>}</button></article>)}</div>}
        </section>}
        {active === 'Развитие' && <section className="catalog-section section-wrap"><div className="section-kicker">УЧИСЬ И ПРОБУЙ НОВОЕ</div><h2>Развитие</h2><div className="catalog-empty"><Sprout size={28}/><strong>Пространство возможностей</strong><span>Здесь появятся программы, мастер-классы и образовательные направления центра.</span></div></section>}
        {active === 'О центре' && <section className="catalog-section section-wrap"><div className="section-kicker">НАША ИСТОРИЯ И ЦЕННОСТИ</div><h2>О центре</h2><div className="catalog-empty"><HeartHandshake size={28}/><strong>Место, где можно быть собой</strong><span>Мы создаём открытое пространство для общения, творчества, развития и взаимной поддержки в Асбесте.</span></div></section>}
        {active === 'Главная' && <>
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
        </>}
      </main>

      <footer className="site-footer">
        <div className="footer-top"><a className="brand footer-brand" href="#top"><span className="brand-mark"><span /></span><span className="brand-copy"><strong>Центр Притяжения</strong><small>Притягиваем возможности. Вдохновляем на рост.</small></span></a><div className="footer-location"><MapPin size={17} /> Асбест, Свердловская область</div></div>
        <div className="footer-bottom"><span>© Центр Притяжения</span><span>Тепло. Доверие. Развитие.</span><span>Сделано с заботой о людях</span></div>
      </footer>

      {accountOpen && user && (
        <div className="account-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setAccountOpen(false)
        }}>
          <section className="account-panel" role="dialog" aria-modal="true" aria-labelledby="account-title">
            <button className="account-close" type="button" onClick={() => setAccountOpen(false)} aria-label="Закрыть"><X size={19} /></button>
            <div className="auth-kicker">ЦЕНТР ПРИТЯЖЕНИЯ · ЛИЧНОЕ ПРОСТРАНСТВО</div>
            <h2 id="account-title">Мой профиль</h2>
            <p className="account-subtitle">Здесь начинается твоё пространство в сообществе.</p>
            <div className="account-identity">
              <div className="account-avatar"><CircleUserRound size={30} /></div>
              <div><strong>{profileDraft.display_name || 'Участник'}</strong><span><Mail size={13} />{user.email}</span><small>{accountRole}</small></div>
            </div>
            {profileLoading ? <div className="account-loading">Загружаем профиль…</div> : (
              <form className="account-form" onSubmit={handleProfileSave}>
                <label>Как к тебе обращаться<input value={profileDraft.display_name} onChange={e => setProfileDraft(p => ({ ...p, display_name: e.target.value }))} maxLength={80} placeholder="Имя" /></label>
                <label>О себе<textarea value={profileDraft.bio} onChange={e => setProfileDraft(p => ({ ...p, bio: e.target.value }))} maxLength={500} rows={3} placeholder="Немного о себе — по желанию" /></label>
                <label>Город<input value={profileDraft.city} onChange={e => setProfileDraft(p => ({ ...p, city: e.target.value }))} maxLength={100} placeholder="Город" /></label>
                <label>Интересы<input value={profileDraft.interests} onChange={e => setProfileDraft(p => ({ ...p, interests: e.target.value }))} maxLength={300} placeholder="Например: музыка, спорт, творчество" /><small>Перечисли интересы через запятую.</small></label>
                <label>Видимость профиля<select value={profileDraft.visibility} onChange={e => setProfileDraft(p => ({ ...p, visibility: e.target.value as ProfileDraft['visibility'] }))}><option value="community">Виден участникам сообщества</option><option value="private">Только мне</option></select></label>
                {profileError && <div className="auth-feedback error" role="alert">{profileError}</div>}
                {profileMessage && <div className="auth-feedback success" role="status">{profileMessage}</div>}
                <button className="button-primary account-save" type="submit" disabled={profileSaving}><Save size={16} />{profileSaving ? 'Сохраняем…' : 'Сохранить изменения'}</button>
              </form>
            )}
            <div className="account-footer"><span>Управление учётной записью</span><button type="button" onClick={async () => { await handleSignOut(); setAccountOpen(false) }}><LogOut size={15} />Выйти</button></div>
          </section>
        </div>
      )}

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