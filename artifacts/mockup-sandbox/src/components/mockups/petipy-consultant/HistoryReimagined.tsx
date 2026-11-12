import './_group.css';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native-web';
import { ArrowDownLeft, ArrowUpLeft, CalendarDays, Check, Clock3, PhoneCall, RefreshCw } from 'lucide-react';
import { petipyTokens as t } from './_shared/tokens';

const tx = (size: number, color: string = t.ink, weight: number = 500): React.CSSProperties => ({ fontFamily: 'Tahoma, sans-serif', direction: 'rtl', textAlign: 'right', fontSize: size, color, fontWeight: weight as any });
const periods = ['۷ روز', '۳۰ روز', '۹۰ روز', '۱ سال'];
const calls = [
  { time: 'امروز · ۱۴:۰۸', duration: '۱۵ دقیقه', status: 'پایان‌یافته', tone: t.success },
  { time: 'امروز · ۱۱:۴۲', duration: '۸ دقیقه', status: 'پایان‌یافته', tone: t.success },
  { time: 'دیروز · ۱۸:۲۶', duration: '—', status: 'بدون پاسخ', tone: t.warning },
  { time: 'دیروز · ۱۰:۱۵', duration: '۲۱ دقیقه', status: 'پایان‌یافته', tone: t.success },
  { time: '۲۲ خرداد · ۱۶:۵۰', duration: '—', status: 'ردشده', tone: t.danger },
];
export function HistoryReimagined() {
  const [period, setPeriod] = useState('۳۰ روز');
  const [note, setNote] = useState('');
  return <View style={{ minHeight: '100dvh', background: t.background, direction: 'rtl', fontFamily: 'Tahoma, sans-serif' }}>
    <ScrollView contentContainerStyle={{ minHeight: 844, width: '100%', maxWidth: 390, marginLeft: 'auto', marginRight: 'auto', paddingTop: 22, paddingRight: 22, paddingBottom: 27, paddingLeft: 22, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 17 }}>
      <View style={{ display: 'flex', flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' }}>
        <View><Text style={{ ...tx(12, t.violet, 800) }}>دفتر تماس‌های شخصی</Text><Text style={{ ...tx(23, t.ink, 800), marginTop: 3 }}>آمار و سوابق</Text></View>
        <Pressable onPress={() => setNote('برای دریافت آمار، اتصال حساب مشاور لازم است.')} style={{ width: 46, height: 46, borderRadius: 14, background: t.surface, border: `1px solid ${t.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><RefreshCw size={17} color={t.violet} /></Pressable>
      </View>
      <View style={{ display: 'flex', flexDirection: 'row-reverse', alignItems: 'center', gap: 7 }}><CalendarDays size={16} color={t.violet} /><Text style={tx(12, t.inkSoft)}>بازه‌ی گزارش</Text><Text style={{ ...tx(10, t.inkSoft), marginRight: 'auto' }}>۳۰ روز گذشته</Text></View>
      <View style={{ display: 'flex', flexDirection: 'row-reverse', gap: 5, padding: 4, background: '#ECE8F4', borderRadius: 15 }}>
        {periods.map((p) => <Pressable key={p} onPress={() => setPeriod(p)} style={{ flex: 1, height: 42, borderRadius: 11, background: period === p ? t.violet : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Text style={tx(11, period === p ? 'white' : t.inkSoft, 700)}>{p}</Text></Pressable>)}
      </View>

      <View style={{ paddingTop: 20, paddingRight: 18, paddingBottom: 16, paddingLeft: 18, background: t.violet, borderRadius: '24px 24px 24px 8px', color: 'white', position: 'relative', overflow: 'hidden' }}>
        <View style={{ position: 'absolute', width: 120, height: 120, border: '1px solid rgba(255,255,255,.15)', borderRadius: 99, left: -35, bottom: -60 }} />
        <Text style={tx(12, '#E4DAFF', 700)}>دقایق پاسخ‌گویی · {period}</Text>
        <View style={{ display: 'flex', flexDirection: 'row-reverse', alignItems: 'baseline', gap: 7, marginTop: 8 }}><Text style={tx(39, 'white', 800)}>۴۴</Text><Text style={tx(13, '#E4DAFF')}>دقیقه</Text></View>
        <View style={{ marginTop: 16, height: 1, background: 'rgba(255,255,255,.24)' }} />
        <Text style={{ ...tx(11, '#DED4FA'), marginTop: 11 }}>بر پایه‌ی زمان گفت‌وگوی ثبت‌شده در سرور</Text>
      </View>
      <View style={{ display: 'flex', flexDirection: 'row-reverse', borderTop: `1px solid ${t.line}`, borderBottom: `1px solid ${t.line}`, padding: '13px 0' }}>
        <Metric icon={<PhoneCall size={16} color={t.violet} />} label="کل تماس‌ها" value="۱۲" />
        <Metric icon={<Check size={16} color={t.success} />} label="نرخ پاسخ‌گویی" value="۸۳٪" />
        <Metric icon={<ArrowDownLeft size={16} color={t.warning} />} label="بی‌پاسخ" value="۲" last />
      </View>
      {note ? <Text style={{ ...tx(10, t.warning), lineHeight: '18px' }}>{note}</Text> : null}

      <View style={{ display: 'flex', flexDirection: 'row-reverse', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 2 }}>
        <Text style={tx(15, t.ink, 800)}>تماس‌های اخیر</Text><Text style={tx(10, t.inkSoft)}>فقط سوابق حساب خودتان</Text>
      </View>
      <View style={{ position: 'relative', paddingRight: 17 }}>
        <View style={{ position: 'absolute', right: 5, top: 5, bottom: 8, width: 1, background: '#DCD5E9' }} />
        {calls.map((c, i) => <View key={i} style={{ position: 'relative', paddingBottom: 14, display: 'flex', flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ position: 'absolute', right: -16, top: 8, width: 9, height: 9, borderRadius: 9, background: c.tone, border: `2px solid ${t.background}`, boxSizing: 'content-box' }} />
          <View style={{ display: 'flex', flexDirection: 'row-reverse', alignItems: 'center', gap: 9 }}>
            <View style={{ width: 33, height: 33, borderRadius: 12, background: c.tone === t.success ? '#E7F2ED' : c.tone === t.danger ? '#F9E9EC' : '#F8EFDF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{c.tone === t.success ? <ArrowUpLeft size={16} color={c.tone} /> : <ArrowDownLeft size={16} color={c.tone} />}</View>
            <View><Text style={tx(12, t.ink, 700)}>تماس مشاوره</Text><Text style={{ ...tx(11, t.inkSoft), marginTop: 3 }}>{c.time}</Text></View>
          </View>
          <View style={{ alignItems: 'flex-start', gap: 4 }}><Text style={tx(11, t.ink, 700)}>{c.duration}</Text><Text style={tx(10, c.tone)}>{c.status}</Text></View>
        </View>)}
      </View>
      <View style={{ marginTop: 'auto', paddingTop: 13, borderTop: `1px solid ${t.line}`, display: 'flex', flexDirection: 'row-reverse', justifyContent: 'space-around' }}>
        <Text style={tx(11, t.inkSoft)}>خانه</Text><Text style={tx(11, t.violet, 800)}>گزارش</Text><Text style={tx(11, t.inkSoft)}>حساب</Text>
      </View>
    </ScrollView>
  </View>;
}
function Metric({ icon, label, value, last }: { icon: React.ReactNode; label: string; value: string; last?: boolean }) {
  return <View style={{ flex: 1, alignItems: 'flex-end', paddingRight: 10, borderRight: last ? 'none' : `1px solid ${t.line}` }}>
    <View style={{ display: 'flex', flexDirection: 'row-reverse', alignItems: 'center', gap: 5 }}>{icon}<Text style={tx(10, t.inkSoft)}>{label}</Text></View><Text style={{ ...tx(19, t.ink, 800), marginTop: 6 }}>{value}</Text>
  </View>;
}
