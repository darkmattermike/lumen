import { useState } from 'react'
import ScreenWrap from '../../components/ScreenWrap/ScreenWrap'
import { LoadingShell, ErrorShell } from '../../components/PageShell/PageShell'
import { useApi } from '../../hooks/useApi'
import { api } from '../../data/api'
import styles from './GmailInbox.module.css'

function fmt(n) { return Number(n||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}) }
function fmtDate(d) { if(!d) return '—'; return new Date(d).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) }
function daysUntil(d) { if(!d) return null; return Math.ceil((new Date(d)-new Date())/86400000) }

function ScanBtn({label,onClick,scanning}) {
  return <button className={styles.scanBtn} onClick={onClick} disabled={scanning}>{scanning?<><span className={styles.scanDot}/> Scanning...</>:label}</button>
}

function SubCard({sub,onIgnore}) {
  const [finding,setFinding]=useState(false)
  const [url,setUrl]=useState(sub.unsubscribe_url||null)
  const days=daysUntil(sub.next_renewal)
  const urgent=days!==null&&days<=7&&days>=0
  async function handleFind(){setFinding(true);try{const r=await api.gmailUnsubLink({serviceId:sub.id,serviceName:sub.service_name,sender:sub.sender});if(r.url)setUrl(r.url)}catch{}finally{setFinding(false)}}
  return (
    <div className={`${styles.card} ${urgent?styles.cardUrgent:''}`}>
      <div className={styles.cardIcon}>{sub.icon||'📱'}</div>
      <div className={styles.cardBody}>
        <div className={styles.cardName}>{sub.service_name}</div>
        <div className={styles.cardMeta}>
          {sub.amount?`$${fmt(sub.amount)} / ${sub.billing_cycle||'month'}`:'Amount unknown'}
          {sub.prev_amount&&Number(sub.prev_amount)!==Number(sub.amount)&&<span style={{color:'var(--debt)',marginLeft:6}}>↑ was ${fmt(sub.prev_amount)}</span>}
          {' · '}
          {days===null?'renewal unknown':days<0?<span style={{color:'var(--ink-2)'}}>renewed {Math.abs(days)}d ago</span>:days===0?<span style={{color:'var(--debt)'}}>renews today</span>:<span style={{color:urgent?'var(--warn)':'var(--ink-2)'}}>renews in {days}d · {fmtDate(sub.next_renewal)}</span>}
        </div>
        <div className={styles.cardActions}>
          {url?<a href={url} target="_blank" rel="noopener noreferrer" className={styles.unsubLink}>↗ Unsubscribe</a>:<button className={styles.findUnsubBtn} onClick={handleFind} disabled={finding}>{finding?'Looking...':'🔍 Find Unsubscribe Link'}</button>}
          <button className={styles.ignoreBtn} onClick={()=>onIgnore(sub.id)}>Hide</button>
        </div>
      </div>
    </div>
  )
}

function PriceCard({change,onDismiss}) {
  const delta=Number(change.new_amount)-Number(change.old_amount)
  const up=delta>0
  return (
    <div className={`${styles.card} ${up?styles.cardUrgent:''}`}>
      <div className={styles.cardIcon}>{up?'📈':'📉'}</div>
      <div className={styles.cardBody}>
        <div className={styles.cardName}>{change.service_name} price {up?'increase':'decrease'}</div>
        <div className={styles.cardMeta}>
          <span style={{color:'var(--ink-2)'}}>${fmt(change.old_amount)}</span>
          <span style={{margin:'0 6px'}}>→</span>
          <span style={{color:up?'var(--debt)':'var(--safe)',fontWeight:600}}>${fmt(change.new_amount)}</span>
          <span style={{marginLeft:8,color:up?'var(--debt)':'var(--safe)'}}>{up?'+':''}${fmt(Math.abs(delta))}/mo</span>
        </div>
        <div className={styles.cardSubject}>{change.email_subject}</div>
      </div>
      <button className={styles.ignoreBtn} onClick={()=>onDismiss(change.id)}>Got it</button>
    </div>
  )
}

function BillSuggCard({sug,onAdd,onDismiss}) {
  const [adding,setAdding]=useState(false)
  async function handleAdd(){
    setAdding(true)
    try{
      const day=sug.due_date?new Date(sug.due_date).getDate():1
      await api.createRecurring({name:sug.name,amount:sug.amount||0,day_of_month:day,type:'bill',icon:sug.icon||'📄',frequency:'monthly'})
      await api.gmailUpdateBillSug(sug.id,{status:'added'})
      onAdd()
    }catch(e){alert('Failed: '+e.message)}
    finally{setAdding(false)}
  }
  return (
    <div className={styles.card}>
      <div className={styles.cardIcon}>{sug.icon||'📄'}</div>
      <div className={styles.cardBody}>
        <div className={styles.cardName}>{sug.name}</div>
        <div className={styles.cardMeta}>{sug.amount?`$${fmt(sug.amount)} due`:'Amount unknown'}{sug.due_date&&` · ${fmtDate(sug.due_date)}`}</div>
        <div className={styles.cardSubject}>{sug.email_subject}</div>
        <div className={styles.cardActions}>
          <button className={styles.addBillBtn} onClick={handleAdd} disabled={adding}>{adding?'Adding...':'+ Add to Calendar'}</button>
          <button className={styles.ignoreBtn} onClick={()=>onDismiss(sug.id)}>Dismiss</button>
        </div>
      </div>
    </div>
  )
}

function PendingCard({charge,onDismiss}) {
  return (
    <div className={styles.card}>
      <div className={styles.cardIcon}>{charge.icon||'📦'}</div>
      <div className={styles.cardBody}>
        <div className={styles.cardName}>{charge.merchant}</div>
        <div className={styles.cardMeta}>
          <span style={{color:'var(--warn)'}}>${fmt(charge.amount)}</span>
          {' · ordered '}{fmtDate(charge.order_date)}
          {charge.expected_charge&&<span style={{color:'var(--ink-2)'}}> · expected {fmtDate(charge.expected_charge)}</span>}
        </div>
        <div className={styles.cardSubject}>{charge.email_subject}</div>
      </div>
      <button className={styles.ignoreBtn} onClick={()=>onDismiss(charge.id)}>Dismiss</button>
    </div>
  )
}

function UnusedCard({sub}) {
  const [finding,setFinding]=useState(false)
  const [url,setUrl]=useState(sub.unsubUrl||null)
  const mo=sub.cycle==='annual'?Number(sub.amount||0)/12:Number(sub.amount||0)
  async function handleFind(){setFinding(true);try{const r=await api.gmailUnsubLink({serviceId:sub.id,serviceName:sub.service,sender:null});if(r.url)setUrl(r.url)}catch{}finally{setFinding(false)}}
  return (
    <div className={styles.card}>
      <div className={styles.cardIcon}>{sub.icon}</div>
      <div className={styles.cardBody}>
        <div className={styles.cardName}>{sub.service}</div>
        <div className={styles.cardMeta}>{sub.amount?`$${fmt(mo)}/mo`:'Amount unknown'} · <span style={{color:'var(--warn)'}}>No usage in 60 days</span></div>
        <div className={styles.cardActions}>
          {url?<a href={url} target="_blank" rel="noopener noreferrer" className={styles.unsubLink}>↗ Unsubscribe</a>:<button className={styles.findUnsubBtn} onClick={handleFind} disabled={finding}>{finding?'Looking...':'🔍 Find Unsubscribe Link'}</button>}
        </div>
      </div>
    </div>
  )
}

export default function GmailInbox() {
  const {data:statusData,loading,error}=useApi(api.gmailStatus)
  const {data:subsData,   refresh:refreshSubs}   =useApi(api.gmailSubscriptions)
  const {data:ordersData, refresh:refreshOrders} =useApi(api.gmailOrders)
  const {data:priceData,  refresh:refreshPrices} =useApi(api.gmailPriceChanges)
  const {data:sugData,    refresh:refreshSug}    =useApi(api.gmailBillSuggestions)
  const {data:pendData,   refresh:refreshPend}   =useApi(api.gmailPendingCharges)
  const {data:unusedData, refresh:refreshUnused} =useApi(api.gmailUnusedSubs)
  const [scanning,setScanning]=useState(false)
  const [scanMsg,setScanMsg]=useState('')
  const [tab,setTab]=useState('subscriptions')

  if(loading) return <LoadingShell/>
  if(error)   return <ErrorShell message={error}/>
  if(!statusData?.connected) return (
    <ScreenWrap>
      <div className={styles.notConnected}>
        <div className={styles.ncIcon}>✉️</div>
        <div className={styles.ncTitle}>Gmail not connected</div>
        <div className={styles.ncSub}>Connect Gmail in <strong>Settings</strong> to unlock Gmail intelligence.</div>
      </div>
    </ScreenWrap>
  )

  const subs    = subsData?.subscriptions  ||[]
  const orders  = ordersData?.orders       ||[]
  const prices  = priceData?.changes       ||[]
  const sugs    = sugData?.suggestions     ||[]
  const pend    = pendData?.pending        ||[]
  const unused  = unusedData?.unused       ||[]
  const moCost  = subs.reduce((s,x)=>s+(x.billing_cycle==='annual'?Number(x.amount||0)/12:Number(x.amount||0)),0)
  const unusedMo= unused.reduce((s,u)=>s+(u.cycle==='annual'?Number(u.amount||0)/12:Number(u.amount||0)),0)
  const alertCt = prices.length+sugs.length

  const TABS=[
    {key:'subscriptions',label:'Subscriptions',count:subs.length},
    {key:'orders',       label:'Orders',       count:orders.length},
    {key:'alerts',       label:'Alerts',       count:alertCt, urgent:true},
    {key:'pending',      label:'Pending',      count:pend.length},
    {key:'unused',       label:'Unused',       count:unused.length, warn:true},
  ]

  async function handleScanAll(){
    setScanning(true);setScanMsg('')
    try{
      await Promise.allSettled([api.gmailScanSubs(),api.gmailScanOrders(),api.gmailPhase5Scan()])
      refreshSubs();refreshOrders();refreshPrices();refreshSug();refreshPend();refreshUnused()
      setScanMsg('Scan complete');setTimeout(()=>setScanMsg(''),4000)
    }catch(e){setScanMsg('Error: '+e.message)}
    finally{setScanning(false)}
  }

  async function ignore(fn,refresh){return async(id)=>{await fn(id,{status:'ignored'});refresh()}}

  return (
    <ScreenWrap>
      <div className={styles.header}>
        <div>
          <div className={styles.pre}>✉ Gmail Intelligence</div>
          <div className={styles.title}>Gmail Inbox</div>
          <div className={styles.sub}>Subscriptions, price alerts, pending orders, and unused services — all from your inbox.</div>
          <div className={styles.stats}>
            <div className={styles.stat}><div className={styles.statL}>Subscriptions</div><div className={styles.statV}>{subs.length}</div></div>
            <div className={styles.stat}><div className={styles.statL}>Monthly Cost</div><div className={styles.statV} style={{color:'var(--debt)'}}>${fmt(moCost)}</div></div>
            {alertCt>0&&<div className={styles.stat}><div className={styles.statL}>Alerts</div><div className={styles.statV} style={{color:'var(--warn)'}}>{alertCt}</div></div>}
            {unusedMo>0&&<div className={styles.stat}><div className={styles.statL}>Unused/mo</div><div className={styles.statV} style={{color:'var(--warn)'}}>${fmt(unusedMo)}</div></div>}
          </div>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:8,alignItems:'flex-end',flexShrink:0}}>
          {scanMsg&&<div style={{fontFamily:'var(--font-mono)',fontSize:10,color:'var(--safe)'}}>{scanMsg}</div>}
          <ScanBtn label="🔍 Scan All" onClick={handleScanAll} scanning={scanning}/>
        </div>
      </div>

      <div className={styles.tabs}>
        {TABS.map(t=>(
          <button key={t.key} className={`${styles.tab} ${tab===t.key?styles.tabOn:''}`} onClick={()=>setTab(t.key)}>
            {t.label}
            {t.count>0&&<span className={styles.tabCount} style={{background:t.urgent?'rgba(240,176,76,.2)':t.warn?'rgba(232,115,99,.15)':undefined,color:t.urgent?'var(--warn)':t.warn?'var(--debt)':undefined}}>{t.count}</span>}
          </button>
        ))}
      </div>

      <div className={styles.body}>
        {tab==='subscriptions'&&(
          <div className={styles.tabPane}>
            <div className={styles.paneHeader}><div className={styles.paneTitle}>Active Subscriptions <span className={styles.paneTitleSub}>~${fmt(moCost)}/mo</span></div></div>
            {subs.length===0?<div className={styles.empty}>No subscriptions detected. Click <strong>Scan All</strong> to search.</div>
              :<div className={styles.cardList}>{subs.map(s=><SubCard key={s.id} sub={s} onIgnore={async(id)=>{await api.gmailUpdateSub(id,{status:'ignored'});refreshSubs()}}/>)}</div>}
          </div>
        )}

        {tab==='orders'&&(
          <div className={styles.tabPane}>
            <div className={styles.paneHeader}><div className={styles.paneTitle}>Recent Orders</div></div>
            {orders.length===0?<div className={styles.empty}>No orders. Click <strong>Scan All</strong>.</div>
              :<div className={styles.cardList}>{orders.map(o=>(
                <div key={o.id} className={styles.card}>
                  <div className={styles.cardIcon}>{o.icon||'📦'}</div>
                  <div className={styles.cardBody}>
                    <div className={styles.cardName}>{o.merchant}</div>
                    <div className={styles.cardMeta}>{o.amount?`$${fmt(o.amount)}`:'Unknown'} · {fmtDate(o.order_date)}{o.estimated_delivery&&<span style={{color:'var(--calm)'}}> · Arrives {o.estimated_delivery}</span>}</div>
                    <div className={styles.cardSubject}>{o.email_subject}</div>
                  </div>
                  <button className={styles.ignoreBtn} onClick={async()=>{await api.gmailUpdateOrder(o.id,{status:'dismissed'});refreshOrders()}}>Dismiss</button>
                </div>
              ))}</div>}
          </div>
        )}

        {tab==='alerts'&&(
          <div className={styles.tabPane}>
            {prices.length>0&&<>
              <div className={styles.paneHeader}><div className={styles.paneTitle}>Price Changes</div></div>
              <div className={styles.cardList}>{prices.map(c=><PriceCard key={c.id} change={c} onDismiss={async(id)=>{await api.gmailUpdatePriceChange(id,{status:'dismissed'});refreshPrices()}}/>)}</div>
            </>}
            {sugs.length>0&&<>
              <div className={styles.paneHeader} style={{marginTop:prices.length?24:0}}><div className={styles.paneTitle}>New Bill Suggestions</div></div>
              <div className={styles.cardList}>{sugs.map(s=><BillSuggCard key={s.id} sug={s} onAdd={refreshSug} onDismiss={async(id)=>{await api.gmailUpdateBillSug(id,{status:'dismissed'});refreshSug()}}/>)}</div>
            </>}
            {prices.length===0&&sugs.length===0&&<div className={styles.empty}>No alerts. Lumen will flag price changes and new bills automatically.</div>}
          </div>
        )}

        {tab==='pending'&&(
          <div className={styles.tabPane}>
            <div className={styles.paneHeader}><div className={styles.paneTitle}>Pending Charges <span className={styles.paneTitleSub}>ordered but not yet in Plaid</span></div></div>
            {pend.length===0?<div className={styles.empty}>No pending charges. Orders appear here before they hit your card.</div>
              :<div className={styles.cardList}>{pend.map(p=><PendingCard key={p.id} charge={p} onDismiss={async(id)=>{await api.gmailUpdatePending(id,{status:'dismissed'});refreshPend()}}/>)}</div>}
          </div>
        )}

        {tab==='unused'&&(
          <div className={styles.tabPane}>
            <div className={styles.paneHeader}><div className={styles.paneTitle}>Possibly Unused <span className={styles.paneTitleSub}>no activity in 60 days</span></div></div>
            {unused.length===0?<div className={styles.empty}>All subscriptions show recent activity. Nothing to cut.</div>
              :<div className={styles.cardList}>{unused.map((u,i)=><UnusedCard key={i} sub={u}/>)}</div>}
          </div>
        )}
      </div>
    </ScreenWrap>
  )
}
