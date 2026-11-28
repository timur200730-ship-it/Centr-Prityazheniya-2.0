import { useCallback, useEffect, useState } from 'react'
import { CalendarDays, Check, Copy, Link2, Plus, RefreshCw, X } from 'lucide-react'
import { supabase } from '../lib/supabase'

type Submission = {
  id: string; title: string; description: string; category: string; starts_at: string; ends_at: string | null
  location: string; room: string; age_limit: string; price_label: string; capacity: number | null
  organizer_name: string; contact_name: string; contact_phone: string; contact_email: string
  status: string; created_at: string
}
type Invite = { id: string; label: string; organizer_name: string; created_at: string; expires_at: string | null; revoked_at: string | null; submissions_count: number }
const fmt = (value: string) => new Date(value).toLocaleString('ru-RU',{dateStyle:'medium',timeStyle:'short'})

export default function ScheduleAdmin({ onClose }: { onClose: () => void }) {
  const [submissions,setSubmissions]=useState<Submission[]>([])
  const [invites,setInvites]=useState<Invite[]>([])
  const [loading,setLoading]=useState(true)
  const [busy,setBusy]=useState<string|null>(null)
  const [error,setError]=useState('')
  const [message,setMessage]=useState('')
  const [label,setLabel]=useState('')
  const [organizer,setOrganizer]=useState('')
  const [newLink,setNewLink]=useState('')
  const [tab,setTab]=useState<'inbox'|'links'>('inbox')
  const load=useCallback(async()=>{
    if(!supabase)return
    setLoading(true);setError('')
    const [s,i]=await Promise.all([
      supabase.from('event_submissions').select('*').order('created_at',{ascending:false}),
      supabase.from('organizer_invite_links').select('id,label,organizer_name,created_at,expires_at,revoked_at,submissions_count').order('created_at',{ascending:false})
    ])
    if(s.error||i.error)setError('Не удалось загрузить данные. Проверьте права администратора и подключение.')
    else {setSubmissions((s.data??[]) as Submission[]);setInvites((i.data??[]) as Invite[])}
    setLoading(false)
  },[])
  useEffect(()=>{void load()},[load])
  const createLink=async()=>{
    if(!supabase||label.trim().length<2){setError('Укажи название ссылки (не менее двух символов).');return}
    setBusy('create');setError('');setMessage('')
    const token=crypto.randomUUID()+crypto.randomUUID()
    const {data,error:rpcError}=await supabase.rpc('create_organizer_invite',{p_token:token,p_label:label.trim(),p_organizer_name:organizer.trim(),p_expires_at:null})
    if(rpcError)setError('Не удалось создать ссылку. Проверьте права администратора.')
    else {const url=new URL(window.location.href);url.search='';url.searchParams.set('request',token);setNewLink(url.toString());setLabel('');setOrganizer('');setMessage('Персональная ссылка создана. Скопируй её и отправь организатору.');await load()}
    setBusy(null)
  }
  const review=async(item:Submission,approve:boolean)=>{
    if(!supabase)return
    setBusy(item.id);setError('');setMessage('')
    const result=approve
      ? await supabase.rpc('approve_event_submission',{p_submission_id:item.id})
      : await supabase.rpc('reject_event_submission',{p_submission_id:item.id,p_note:'Отклонено администратором'})
    if(result.error)setError(approve?'Не удалось утвердить заявку.':'Не удалось отклонить заявку.')
    else {setMessage(approve?'Мероприятие утверждено и опубликовано в афише.':'Заявка отклонена.');await load()}
    setBusy(null)
  }
  const copy=async(value:string)=>{
    try{await navigator.clipboard.writeText(value);setMessage('Ссылка скопирована.')}
    catch{setMessage('Не удалось скопировать автоматически. Выдели и скопируй ссылку вручную.')}
  }
  const pending=submissions.filter(item=>item.status==='pending')
  return <div className="schedule-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}>
    <section className="schedule-panel" role="dialog" aria-modal="true" aria-labelledby="schedule-title">
      <header className="schedule-header"><div><div className="section-kicker">ЦЕНТР ПРИТЯЖЕНИЯ · АДМИНИСТРИРОВАНИЕ</div><h2 id="schedule-title">Управление расписанием</h2><p>Заявки организаторов, согласование и персональные ссылки</p></div><button className="schedule-close" onClick={onClose} aria-label="Закрыть"><X/></button></header>
      <div className="schedule-stats"><div><strong>{pending.length}</strong><span>На рассмотрении</span></div><div><strong>{submissions.filter(x=>x.status==='approved').length}</strong><span>Утверждено</span></div><div><strong>{invites.filter(x=>!x.revoked_at).length}</strong><span>Активные ссылки</span></div></div>
      <div className="schedule-tabs"><button className={tab==='inbox'?'active':''} onClick={()=>setTab('inbox')}>Входящие заявки <span>{pending.length}</span></button><button className={tab==='links'?'active':''} onClick={()=>setTab('links')}>Ссылки организаторов</button><button className="schedule-refresh" onClick={()=>void load()} disabled={loading}><RefreshCw size={15}/> Обновить</button></div>
      {error&&<div className="auth-feedback error">{error}</div>}{message&&<div className="auth-feedback success">{message}</div>}
      {newLink&&<div className="schedule-new-link"><div><strong>Новая персональная ссылка</strong><input readOnly value={newLink}/></div><button className="button-primary" onClick={()=>void copy(newLink)}><Copy size={15}/> Копировать</button></div>}
      {loading?<div className="catalog-empty">Загружаем расписание…</div>:tab==='inbox'?<div className="schedule-list">
        {pending.length===0?<div className="catalog-empty"><CalendarDays size={28}/><strong>Новых заявок пока нет</strong><span>Когда организатор заполнит форму, заявка появится здесь.</span></div>:pending.map(item=><article className="schedule-submission" key={item.id}>
          <div className="schedule-submission-top"><span className="catalog-tag">{item.category||'МЕРОПРИЯТИЕ'}</span><time>{fmt(item.created_at)}</time></div>
          <h3>{item.title}</h3><p>{item.description||'Описание не добавлено.'}</p>
          <div className="schedule-detail-grid"><span><CalendarDays size={14}/>{fmt(item.starts_at)}{item.ends_at?' — '+fmt(item.ends_at):''}</span><span><Link2 size={14}/>{[item.location,item.room].filter(Boolean).join(' · ')||'Место уточняется'}</span><span>Организатор: {item.organizer_name||item.contact_name}</span><span>Возраст: {item.age_limit||'не указан'} · {item.price_label||'стоимость не указана'}</span><span>Контакт: {[item.contact_name,item.contact_phone,item.contact_email].filter(Boolean).join(' · ')}</span></div>
          <div className="schedule-actions"><button className="button-primary" disabled={busy===item.id} onClick={()=>void review(item,true)}><Check size={15}/> Утвердить и опубликовать</button><button className="schedule-reject" disabled={busy===item.id} onClick={()=>void review(item,false)}>Отклонить</button></div>
        </article>)}
      </div>:<div className="schedule-links">
        <div className="schedule-create-link"><h3>Создать ссылку для организатора</h3><p>Ссылка открывает короткую форму без регистрации. Все отправленные мероприятия попадут на модерацию.</p><label>Название ссылки<input value={label} onChange={e=>setLabel(e.target.value)} placeholder="Например, Елена Осинцева"/></label><label>Имя организатора<input value={organizer} onChange={e=>setOrganizer(e.target.value)} placeholder="Имя или название проекта"/></label><button className="button-primary" onClick={()=>void createLink()} disabled={busy==='create'}><Plus size={16}/>{busy==='create'?'Создаём…':'Создать персональную ссылку'}</button></div>
        <h3>Выданные ссылки</h3>{invites.length===0?<p className="organizer-hint">Пока ссылок нет.</p>:invites.map(link=><article className="schedule-invite" key={link.id}><div><strong>{link.label}</strong><span>{link.organizer_name||'Организатор не указан'} · заявок: {link.submissions_count} · создана {fmt(link.created_at)}</span><small>{link.revoked_at?'Отозвана':link.expires_at&&new Date(link.expires_at)<new Date()?'Истекла':'Активна'}</small></div><button onClick={()=>setMessage('Для повторной выдачи ссылки создай новую: исходный секрет хранится только у организатора.')}>Информация</button></article>)}
      </div>}
      <footer className="schedule-footer">Публикация в общей афише происходит только после утверждения администратором.</footer>
    </section>
  </div>
}
