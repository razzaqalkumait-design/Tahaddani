import { CoinsCtx } from '../contexts/CoinsContext';
import { SubCtx } from '../contexts/SubContext';
import { SpinWheel, WHEEL_SEGMENTS, canClaimDaily, getDailyState, saveDailyState, todayStr } from './SpinWheel';
import { COIN_BUNDLES, PACK_TIER_COLOR, PACK_TIER_LABEL, QUESTION_PACKS, SUB_TIERS } from './storeCatalog';
import coinIcon from '../assets/coin-navy.png';
import coinIconWhite from '../assets/COIN_WHITE__1_.png';
import storeIcon from '../assets/store-navy.png';
import storeIconWhite from '../assets/STORE_WHITE__1_.png';
import { useContext, useState } from 'react';
import type { WheelSegment } from './SpinWheel';
import type { Question } from '../types';

export function StoreScreen({ onBack }: { onBack: () => void }) {
  const { coins, spendCoins, unlockedPacks, unlockPack, addCoins } = useContext(CoinsCtx);
  const { tier, setTier, setRemoveAds, removeAds, setRemoveAdsTempUntil, setAllPacksTempUntil } = useContext(SubCtx);
  const [tab, setTab] = useState<'packs' | 'coins' | 'daily' | 'sub'>('packs');
  const [sliding, setSliding] = useState(false);
  const [slideDir, setSlideDir] = useState<'left' | 'right'>('left');
  const [toast, setToast] = useState<string | null>(null);
  const [dailyClaimed, setDailyClaimed] = useState(!canClaimDaily());
  const [showWheel, setShowWheel] = useState(false);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  const TAB_ORDER = ['packs', 'coins', 'sub', 'daily'] as const;
  const switchTab = (t: typeof TAB_ORDER[number]) => {
    if (t === tab || sliding) return;
    const dir = TAB_ORDER.indexOf(t) > TAB_ORDER.indexOf(tab as typeof TAB_ORDER[number]) ? 'left' : 'right';
    setSlideDir(dir); setSliding(true);
    setTimeout(() => { setTab(t); setSliding(false); }, 280);
  };

  const handleWheelReward = (seg: WheelSegment) => {
    setShowWheel(false);
    saveDailyState(todayStr(), getDailyState().streak + 1);
    setDailyClaimed(true);
    if (seg.reward === 'coins') { addCoins(seg.value); showToast(`+${seg.value} عملة! 🎉`); }
    else if (seg.reward === 'all_packs') { setAllPacksTempUntil(Date.now() + 24 * 60 * 60 * 1000); showToast('دخول مجاني لجميع الباقات لمدة 24 ساعة! 🎮'); }
    else if (seg.reward === 'no_ads') { setRemoveAdsTempUntil(Date.now() + 30 * 60 * 1000); showToast('بدون إعلانات لمدة 30 دقيقة! 🚫'); }
  };

  const buyPack = (pack: typeof QUESTION_PACKS[0]) => {
    if (!pack.isPaid) return;
    if (unlockedPacks.includes(pack.id)) return;
    if (spendCoins(pack.price)) { unlockPack(pack.id); showToast(`تم شراء ${pack.name} ✓`); }
    else showToast('عملاتك غير كافية!');
  };

  const buyRemoveAds = () => {
    if (removeAds) return;
    // Real payment would go through RevenueCat/StoreKit here
    setRemoveAds(true);
    addCoins(500);
    showToast('تم إزالة الإعلانات! +500 عملة 🎁');
  };

  const buySub = (sub: typeof SUB_TIERS[0]) => {
    if (tier === sub.id) return;
    // Real payment through RevenueCat/StoreKit here
    setTier(sub.id);
    if (sub.coins > 0) addCoins(sub.coins);
    if (sub.id === 'supporter' || sub.id === 'advocate' || sub.id === 'vip') setRemoveAds(true);
    showToast(`مرحباً في ${sub.name}! 🎉`);
  };

  const buyBundle = (bundle: typeof COIN_BUNDLES[0]) => {
    addCoins(bundle.coins);
    showToast(`تمت إضافة ${bundle.coins.toLocaleString()} عملة ✓`);
  };

  const stripesBg = `repeating-linear-gradient(45deg,rgba(0,27,135,0.06) 0px,rgba(0,27,135,0.06) 1px,transparent 1px,transparent 10px)`;

  const TAB_LABELS: Record<string, React.ReactNode> = {
    packs: <><img src={tab === 'packs' ? storeIcon : storeIconWhite} alt="" style={{ width: 14, height: 14, objectFit: 'contain' }} /> باقات</>,
    coins: <><img src={tab === 'coins' ? coinIcon : coinIconWhite} alt="" style={{ width: 14, height: 14, objectFit: 'contain' }} /> عملات</>,
    sub:   <>👑 اشتراك</>,
    daily: <>🎡 يومي{!dailyClaimed && <span style={{ position: 'absolute', top: 5, right: 8, width: 6, height: 6, borderRadius: '50%', background: '#FF3D68', border: '1.5px solid #001B87' }} />}</>,
  };

  return (
    <div className="screen" style={{ display: 'flex', flexDirection: 'column', direction: 'rtl', background: '#ffffff', backgroundImage: 'radial-gradient(circle, rgba(0,27,135,0.10) 1.5px, transparent 1.5px)', backgroundSize: '20px 20px', animation: 'slideLeft .35s cubic-bezier(.22,1,.36,1) both', overflow: 'hidden' }}>

      {showWheel && <SpinWheel onClose={() => setShowWheel(false)} onReward={handleWheelReward} />}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#001B87', flexShrink: 0 }}>
        <button onClick={onBack} style={{ background: 'rgba(255,255,255,.12)', border: 'none', borderRadius: 8, color: '#fff', fontSize: 18, width: 34, height: 34, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>←</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <img src={storeIconWhite} alt="" style={{ width: 22, height: 22, objectFit: 'contain' }} />
          <span style={{ fontFamily: "'Tajawal',sans-serif", fontWeight: 900, fontSize: 18, color: '#fff' }}>المتجر</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#30E7ED', clipPath: 'polygon(8% 0%, 100% 0%, 92% 100%, 0% 100%)', padding: '5px 14px 5px 10px', boxShadow: '3px 3px 0 rgba(0,0,0,.25)' }}>
          <img src={coinIcon} alt="" style={{ width: 18, height: 18, objectFit: 'contain' }} />
          <span style={{ fontFamily: "'Tajawal',sans-serif", fontWeight: 900, fontSize: 15, color: '#001B87' }}>{coins.toLocaleString()}</span>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', background: '#001B87', flexShrink: 0 }}>
        {TAB_ORDER.map(t => (
          <button key={t} onClick={() => switchTab(t)} style={{ flex: 1, padding: '9px 4px', border: 'none', cursor: 'pointer', fontFamily: "'Tajawal',sans-serif", fontWeight: 800, fontSize: 12, background: tab === t ? '#ffffff' : 'transparent', color: tab === t ? '#001B87' : 'rgba(255,255,255,.55)', clipPath: tab === t ? 'polygon(3% 0%, 97% 0%, 100% 100%, 0% 100%)' : 'none', transition: 'color .2s, background .2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, position: 'relative' }}>
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {/* Sliding content */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        <div style={{ position: 'absolute', inset: 0, overflowY: 'auto', padding: '12px 12px 80px', animation: sliding ? `${slideDir === 'left' ? 'slideLeft' : 'slideRight'} .28s cubic-bezier(.22,1,.36,1) both` : 'none' }}>

          {/* ── Packs tab ── */}
          {tab === 'packs' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* Remove Ads card */}
              <button onClick={buyRemoveAds} style={{ background: removeAds ? 'rgba(56,226,125,.15)' : '#001B87', border: removeAds ? '2px solid #38E27D' : '2px solid #30E7ED', borderRadius: 12, padding: '14px 16px', cursor: removeAds ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: removeAds ? 'none' : '4px 4px 0 #30E7ED' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3, textAlign: 'right' }}>
                  <span style={{ fontFamily: "'Tajawal',sans-serif", fontWeight: 900, fontSize: 15, color: removeAds ? '#38E27D' : '#ffffff' }}>🚫 إزالة الإعلانات</span>
                  <span style={{ fontFamily: "'Tajawal',sans-serif", fontSize: 11, color: removeAds ? '#38E27D' : 'rgba(255,255,255,.55)' }}>{removeAds ? '✓ مفعّل' : '+500 عملة هدية عند الشراء'}</span>
                </div>
                {!removeAds && <div style={{ background: '#30E7ED', color: '#001B87', fontFamily: "'Tajawal',sans-serif", fontWeight: 900, fontSize: 14, padding: '8px 16px', borderRadius: 8, clipPath: 'polygon(4% 0%, 100% 0%, 96% 100%, 0% 100%)' }}>20$</div>}
              </button>

              {/* Question packs */}
              <div style={{ fontFamily: "'Tajawal',sans-serif", fontSize: 11, color: 'rgba(0,27,135,.45)', fontWeight: 700, marginTop: 4 }}>باقات الأسئلة</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {QUESTION_PACKS.map(pack => {
                  const isActive = !pack.isPaid || unlockedPacks.includes(pack.id);
                  const tierColor = PACK_TIER_COLOR[pack.tier] || '#30E7ED';
                  return (
                    <button key={pack.id} onClick={() => buyPack(pack)} style={{ position: 'relative', overflow: 'hidden', background: isActive ? 'rgba(56,226,125,.18)' : '#30E7ED', backgroundImage: isActive ? 'none' : stripesBg, border: isActive ? '2px solid #38E27D' : `2px solid ${tierColor}55`, borderRadius: 10, padding: '12px 10px', cursor: isActive || !pack.isPaid ? 'default' : 'pointer', display: 'flex', flexDirection: 'column', gap: 5, textAlign: 'right', boxShadow: isActive ? 'none' : `3px 3px 0 ${tierColor}40` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <span style={{ fontFamily: "'Tajawal',sans-serif", fontSize: 9, fontWeight: 800, color: tierColor, background: `${tierColor}22`, borderRadius: 4, padding: '2px 6px', border: `1px solid ${tierColor}44` }}>{PACK_TIER_LABEL[pack.tier]}</span>
                        <span style={{ fontSize: 22 }}>{pack.emoji}</span>
                      </div>
                      <span style={{ fontFamily: "'Tajawal',sans-serif", fontWeight: 900, fontSize: 13, color: '#001B87' }}>{pack.name}</span>
                      <span style={{ fontFamily: "'Tajawal',sans-serif", fontSize: 10, color: 'rgba(0,27,135,.55)', lineHeight: 1.4 }}>{pack.desc}</span>
                      {isActive ? (
                        <span style={{ fontFamily: "'Tajawal',sans-serif", fontWeight: 700, fontSize: 11, color: '#38E27D', marginTop: 2 }}>✓ {pack.isPaid ? 'مملوك' : 'مجاني'}</span>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                          <span style={{ fontFamily: "'Tajawal',sans-serif", fontWeight: 900, fontSize: 13, color: '#001B87' }}>{pack.price.toLocaleString()}</span>
                          <img src={coinIcon} alt="" style={{ width: 13, height: 13, objectFit: 'contain' }} />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Restore purchases */}
              <button onClick={() => showToast('جاري استعادة المشتريات... (يتطلب RevenueCat)')} style={{ background: 'transparent', border: '1px solid rgba(0,27,135,.2)', borderRadius: 8, padding: '10px 0', cursor: 'pointer', fontFamily: "'Tajawal',sans-serif", fontSize: 12, color: 'rgba(0,27,135,.45)', fontWeight: 700, marginTop: 4 }}>
                ↩ استعادة المشتريات
              </button>
            </div>
          )}

          {/* ── Coins tab ── */}
          {tab === 'coins' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              <div style={{ fontFamily: "'Tajawal',sans-serif", fontSize: 12, color: 'rgba(0,27,135,.5)', textAlign: 'center', marginBottom: 2 }}>اشحن عملاتك لشراء باقات أسئلة جديدة</div>
              {COIN_BUNDLES.map(bundle => (
                <button key={bundle.id} onClick={() => buyBundle(bundle)} style={{ background: '#30E7ED', backgroundImage: stripesBg, border: '2px solid rgba(0,27,135,.15)', borderRadius: 10, padding: '12px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '3px 3px 0 rgba(0,27,135,.2)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontFamily: "'Tajawal',sans-serif", fontWeight: 900, fontSize: 18, color: '#001B87' }}>{bundle.coins.toLocaleString()}</span>
                      <img src={coinIcon} alt="" style={{ width: 20, height: 20, objectFit: 'contain' }} />
                    </div>
                    {bundle.badge && <span style={{ fontFamily: "'Tajawal',sans-serif", fontSize: 10, color: '#38E27D', fontWeight: 700 }}>{bundle.badge}</span>}
                  </div>
                  <div style={{ background: '#001B87', color: '#30E7ED', fontFamily: "'Tajawal',sans-serif", fontWeight: 900, fontSize: 13, padding: '7px 16px', borderRadius: 6, clipPath: 'polygon(4% 0%, 100% 0%, 96% 100%, 0% 100%)' }}>{bundle.price}</div>
                </button>
              ))}
              <div style={{ fontFamily: "'Tajawal',sans-serif", fontSize: 10, color: 'rgba(0,27,135,.3)', textAlign: 'center', marginTop: 4 }}>* المدفوعات تتطلب RevenueCat — للعرض التوضيحي فقط</div>
            </div>
          )}

          {/* ── Subscription tab ── */}
          {tab === 'sub' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontFamily: "'Tajawal',sans-serif", fontSize: 12, color: 'rgba(0,27,135,.5)', textAlign: 'center' }}>اشتراك شهري — يُجدَّد تلقائياً</div>
              {SUB_TIERS.map(sub => {
                const active = tier === sub.id;
                return (
                  <button key={sub.id} onClick={() => buySub(sub)} style={{ background: active ? sub.color + '22' : '#001B87', border: active ? `2.5px solid ${sub.color}` : '2px solid rgba(255,255,255,.1)', borderRadius: 14, padding: '14px 16px', cursor: active ? 'default' : 'pointer', display: 'flex', flexDirection: 'column', gap: 8, textAlign: 'right', boxShadow: active ? `0 0 0 3px ${sub.color}44` : '4px 4px 0 rgba(48,231,237,.15)', position: 'relative', overflow: 'hidden' }}>
                    {active && <div style={{ position: 'absolute', top: 8, left: 10, background: sub.color, color: '#001B87', fontSize: 9, fontWeight: 900, padding: '2px 8px', borderRadius: 4, fontFamily: "'Tajawal',sans-serif" }}>مفعّل</div>}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ background: sub.color, color: '#001B87', fontFamily: "'Tajawal',sans-serif", fontWeight: 900, fontSize: 14, padding: '6px 18px', borderRadius: 8, clipPath: 'polygon(0% 0%, 96% 0%, 100% 100%, 4% 100%)' }}>{sub.price}<span style={{ fontSize: 10, fontWeight: 700 }}>/شهر</span></div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {sub.badge && <span style={{ fontSize: 20 }}>{sub.badge}</span>}
                        <span style={{ fontFamily: "'Tajawal',sans-serif", fontWeight: 900, fontSize: 17, color: sub.color }}>{sub.name}</span>
                      </div>
                    </div>
                    {sub.coins > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(255,255,255,.06)', borderRadius: 7, padding: '6px 10px', alignSelf: 'flex-start' }}>
                        <img src={coinIconWhite} alt="" style={{ width: 14, height: 14, objectFit: 'contain' }} />
                        <span style={{ fontFamily: "'Tajawal',sans-serif", fontWeight: 900, fontSize: 13, color: sub.color }}>+{sub.coins.toLocaleString()} عملة عند الشراء</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {sub.desc.map((d, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ color: sub.color, fontSize: 12 }}>✓</span>
                          <span style={{ fontFamily: "'Tajawal',sans-serif", fontSize: 12, color: 'rgba(255,255,255,.7)' }}>{d}</span>
                        </div>
                      ))}
                    </div>
                  </button>
                );
              })}
              <button onClick={() => showToast('جاري استعادة الاشتراك... (يتطلب RevenueCat)')} style={{ background: 'transparent', border: '1px solid rgba(0,27,135,.2)', borderRadius: 8, padding: '10px 0', cursor: 'pointer', fontFamily: "'Tajawal',sans-serif", fontSize: 12, color: 'rgba(0,27,135,.45)', fontWeight: 700 }}>
                ↩ استعادة الاشتراك
              </button>
              <div style={{ fontFamily: "'Tajawal',sans-serif", fontSize: 10, color: 'rgba(0,27,135,.3)', textAlign: 'center' }}>* الاشتراكات تتطلب RevenueCat — للعرض التوضيحي فقط</div>
            </div>
          )}

          {/* ── Daily wheel tab ── */}
          {tab === 'daily' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center', paddingTop: 10 }}>
              <div style={{ fontFamily: "'Tajawal',sans-serif", fontSize: 13, color: 'rgba(0,27,135,.6)', textAlign: 'center' }}>دوّرة يومية واحدة — الجوائز المحتملة:</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
                {WHEEL_SEGMENTS.map((seg, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, background: seg.color + '18', border: `1.5px solid ${seg.color}44`, borderRadius: 10, padding: '10px 14px' }}>
                    <span style={{ fontSize: 20 }}>{seg.emoji}</span>
                    <span style={{ fontFamily: "'Tajawal',sans-serif", fontWeight: 800, fontSize: 14, color: '#001B87', flex: 1 }}>{seg.label}</span>
                  </div>
                ))}
              </div>
              <button onClick={() => { if (!dailyClaimed) setShowWheel(true); }} disabled={dailyClaimed} style={{ background: dailyClaimed ? 'rgba(0,27,135,.1)' : '#001B87', color: dailyClaimed ? 'rgba(0,27,135,.35)' : '#30E7ED', fontFamily: "'Tajawal',sans-serif", fontWeight: 900, fontSize: 16, border: dailyClaimed ? 'none' : '2px solid #30E7ED', borderRadius: 12, padding: '15px 40px', cursor: dailyClaimed ? 'not-allowed' : 'pointer', boxShadow: dailyClaimed ? 'none' : '4px 4px 0 #30E7ED', transition: 'all .2s' }}>
                {dailyClaimed ? '✓ تم دوران اليوم' : '🎡 دوّر العجلة'}
              </button>
              <div style={{ fontFamily: "'Tajawal',sans-serif", fontSize: 11, color: 'rgba(0,27,135,.35)', textAlign: 'center' }}>
                {dailyClaimed ? 'عد غداً لدورة جديدة' : 'دورة واحدة مجانية كل يوم'}
              </div>
            </div>
          )}
        </div>
      </div>

      {toast && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: '#001B87', color: '#fff', fontFamily: "'Tajawal',sans-serif", fontWeight: 700, fontSize: 13, padding: '9px 20px', borderRadius: 20, boxShadow: '0 4px 20px rgba(0,27,135,.35)', animation: 'slideUp .25s ease both', zIndex: 999, whiteSpace: 'nowrap' }}>{toast}</div>
      )}
    </div>
  );
}

