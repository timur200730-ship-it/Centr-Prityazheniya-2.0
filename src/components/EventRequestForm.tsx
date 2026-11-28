import { useState, type FormEvent } from 'react'
import { CalendarDays, CheckCircle2, MapPin, Send } from 'lucide-react'
import { supabase } from '../lib/supabase'

type Draft = {
  title: string; description: string; category: string; starts_at: string; ends_at: string
  location: string; room: string; age_limit: string; price_label: string; capacity: string
  organizer_name: string; contact_name: string; contact_phone: string; contact_email: string
}
const initial: Draft = {
  title: '', description: '', category: '', starts_at: '', ends_at: '', location: 'Асбест',
  room: '', age_limit: '', price_label: 'Бесплатно', capacity: '', organizer_name: '',
  contact_name: '', contact_phone: '', contact_email: '',
}

export default function EventRequestForm({ token }: { token: string }) {
  const [draft, setDraft] = useState<Draft>(initial)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const change = (key: keyof Draft, value: string) => setDraft(current => ({ ...current, [key]: value }))
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!supabase) { setError('Форма временно недоступна. Попробуйте позже.'); return }
    if (draft.ends_at && new Date(draft.ends_at) <= new Date(draft.starts_at)) {
      setError('Время окончания должно быть позже времени начала.'); return
    }
    setBusy(true); setError('')
    const { error: rpcError } = await supabase.rpc('submit_event_request', {
      p_token: token, p_title: draft.title.trim(), p_description: draft.description.trim(),
      p_category: draft.category, p_starts_at: new Date(draft.starts_at).toISOString(),
      p_ends_at: draft.ends_at ? new Date(draft.ends_at).toISOString() : null,
      p_location: draft.location.trim(), p_room: draft.room.trim(), p_age_limit: draft.age_limit.trim(),
      p_price_label: draft.price_label.trim(), p_capacity: draft.capacity ? Number(draft.capacity) : null,
      p_organizer_name: draft.organizer_name.trim(), p_contact_name: draft.contact_name.trim(),
      p_contact_phone: draft.contact_phone.trim(), p_contact_email: draft.contact_email.trim(),
    })
    setBusy(false)
    if (rpcError) setError(rpcError.message.includes('invalid_or_expired_link')
      ? 'Ссылка недействительна или срок её действия закончился. Попросите администратора выдать новую.'
      : 'Не удалось отправить заявку. Проверьте заполнение полей и попробуйте ещё раз.')
    else setSent(true)
  }
  return <main className="request-page">
    <div className="request-card">
      <a className="request-brand" href="/"><span className="brand-mark"><span /></span><span><strong>Центр Притяжения</strong><small>Заявка на мероприятие</small></span></a>
      {sent ? <div className="request-success"><CheckCircle2 size={48}/><h1>Заявка отправлена!</h1><p>Спасибо. Администратор Центра Притяжения проверит информацию и свяжется с тобой, если понадобятся уточнения.</p><a href="/">Вернуться на сайт</a></div> :
      <>
        <div className="request-kicker"><CalendarDays size={16}/> ПРЕДЛОЖИТЬ МЕРОПРИЯТИЕ</div>
        <h1>Расскажи о своей встрече</h1>
        <p className="request-intro">Заполни форму — мероприятие попадёт администратору на согласование. После утверждения оно появится в общей афише.</p>
        <form className="request-form" onSubmit={submit}>
          <label>Название мероприятия *<input required maxLength={160} value={draft.title} onChange={e=>change('title',e.target.value)} placeholder="Например, творческая мастерская"/></label>
          <label>Краткое описание<textarea rows={4} maxLength={5000} value={draft.description} onChange={e=>change('description',e.target.value)} placeholder="Что будет происходить? Для кого встреча?"/></label>
          <div className="request-grid">
            <label>Направление<select value={draft.category} onChange={e=>change('category',e.target.value)}><option value="">Выбери направление</option><option>Творчество</option><option>Обучение</option><option>Здоровье</option><option>Общение</option><option>Детям и семье</option><option>Другое</option></select></label>
            <label>Возраст участников<input value={draft.age_limit} onChange={e=>change('age_limit',e.target.value)} placeholder="Например, 16+"/></label>
          </div>
          <div className="request-grid">
            <label>Дата и время начала *<input required type="datetime-local" value={draft.starts_at} onChange={e=>change('starts_at',e.target.value)}/></label>
            <label>Дата и время окончания<input type="datetime-local" value={draft.ends_at} onChange={e=>change('ends_at',e.target.value)}/></label>
          </div>
          <div className="request-grid">
            <label>Место проведения<input value={draft.location} onChange={e=>change('location',e.target.value)} placeholder="Адрес или площадка"/></label>
            <label>Зал / помещение<input value={draft.room} onChange={e=>change('room',e.target.value)} placeholder="Например, большой зал"/></label>
          </div>
          <div className="request-grid">
            <label>Стоимость<input value={draft.price_label} onChange={e=>change('price_label',e.target.value)} placeholder="Бесплатно / 500 ₽"/></label>
            <label>Количество мест<input type="number" min="1" step="1" value={draft.capacity} onChange={e=>change('capacity',e.target.value)} placeholder="Без ограничения"/></label>
          </div>
          <div className="request-section-title">Кто проводит мероприятие</div>
          <label>Имя организатора<input value={draft.organizer_name} onChange={e=>change('organizer_name',e.target.value)} placeholder="Имя или название проекта"/></label>
          <label>Контактное лицо *<input required value={draft.contact_name} onChange={e=>change('contact_name',e.target.value)} placeholder="Как к тебе обращаться"/></label>
          <div className="request-grid">
            <label>Телефон<input type="tel" value={draft.contact_phone} onChange={e=>change('contact_phone',e.target.value)} placeholder="+7 ..."/></label>
            <label>Электронная почта<input type="email" value={draft.contact_email} onChange={e=>change('contact_email',e.target.value)} placeholder="name@example.com"/></label>
          </div>
          {error && <div className="auth-feedback error" role="alert">{error}</div>}
          <p className="request-consent">Отправляя заявку, ты разрешаешь администрации использовать указанные контакты для согласования мероприятия.</p>
          <button className="button-primary request-submit" type="submit" disabled={busy}>{busy ? 'Отправляем…' : 'Отправить на согласование'} <Send size={16}/></button>
        </form>
      </>}
      <div className="request-footer"><MapPin size={14}/> Асбест · Центр Притяжения</div>
    </div>
  </main>
}
