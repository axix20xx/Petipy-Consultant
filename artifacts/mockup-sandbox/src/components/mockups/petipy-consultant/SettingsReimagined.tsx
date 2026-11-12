import './_group.css';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native-web';
import { Bell, ChevronLeft, CircleHelp, LogOut, Radio, ShieldCheck, Smartphone, UserRound } from 'lucide-react';
import { petipyTokens as t } from './_shared/tokens';

const tx = (size: number, color: string = t.ink, weight: number = 500): React.CSSProperties => ({ fontFamily: 'Tahoma, sans-serif', direction: 'rtl', textAlign: 'right', fontSize: size, color, fontWeight: weight as any });
export function SettingsReimagined() {
  const [message, setMessage] = useState('');
  return <View style={{ minHeight: '100dvh', background: t.background, direction: 'rtl', fontFamily: 'Tahoma, sans-serif' }}>
    <ScrollView contentContainerStyle={{ minHeight: 844, width: '100%', maxWidth: 390, marginLeft: 'auto', marginRight: 'auto', paddingTop: 23, paddingRight: 22, paddingBottom: 25, paddingLeft: 22, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 17 }}>
      <View><Text style={tx(10, t.violet, 800)}>حساب و دستگاه</Text><Text style={{ ...tx(24, t.ink, 800), marginTop: 3 }}>تنظیمات</Text></View>
      <Text style={{ ...tx(12, t.inkSoft), marginTop: -8 }}>اطلاعات آمادگی را از خود دستگاه بررسی کنید.</Text>

      <View style={{ display: 'flex', flexDirection: 'row-reverse', gap: 12, alignItems: 'center', paddingTop: 16, paddingRight: 14, paddingBottom: 16, paddingLeft: 14, background: t.surface, border: `1px solid ${t.line}`, borderRadius: 21 }}>
        <View style={{ width: 49, height: 49, borderRadius: 17, background: t.violetPale, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><UserRound size={23} color={t.violet} /></View>
        <View style={{ flex: 1, minWidth: 0 }}><Text style={tx(14, t.ink, 800)}>مشاور Petipy</Text><Text style={{ ...tx(11, t.inkSoft), marginTop: 5 }}>وضعیت اتصال حساب تأیید نشده</Text></View>
        <View style={{ background: '#F3F0F8', borderRadius: 10, paddingTop: 6, paddingRight: 8, paddingBottom: 6, paddingLeft: 8 }}><Text style={tx(10, t.inkSoft)}>حساب مشاور</Text></View>
      </View>

      <View style={{ display: 'flex', flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginTop: 3 }}>
        <View style={{ flex: 1, minWidth: 0 }}><Text style={tx(15, t.ink, 800)}>آمادگی دریافت تماس</Text><Text style={{ ...tx(11, t.inkSoft), marginTop: 4, lineHeight: '18px' }}>وضعیت‌ها هنوز از دستگاه خوانده نشده‌اند</Text></View>
        <ShieldCheck size={18} color={t.violet} />
      </View>
      <View style={{ background: t.surface, borderRadius: 20, border: `1px solid ${t.line}`, paddingLeft: 13, paddingRight: 13 }}>
        <Readiness icon={<Radio size={18} color={t.warning} />} title="سرویس foreground" detail="وضعیت اجرای سرویس پس‌زمینه هنوز خوانده نشده است." />
        <Readiness icon={<Bell size={18} color={t.warning} />} title="اعلان‌های تماس" detail="مجوز اعلان و کانال تماس دستگاه نیاز به بررسی دارد." />
        <Readiness icon={<Smartphone size={18} color={t.warning} />} title="دسترسی تمام‌صفحه" detail="وضعیت اجازه‌ی نمایش تمام‌صفحه Android مشخص نیست." />
        <Readiness icon={<Bell size={18} color={t.warning} />} title="ثبت اعلان FCM" detail="وضعیت ثبت اعلان این دستگاه هنوز دریافت نشده است." last />
      </View>
      <Pressable onPress={() => setMessage('وضعیت FCM باید از نشست و سرویس رسمی بررسی شود؛ تغییری انجام نشد.')} style={{ display: 'flex', flexDirection: 'row-reverse', alignItems: 'center', gap: 9, paddingTop: 12, paddingRight: 13, paddingBottom: 12, paddingLeft: 13, borderRadius: 14, background: t.violetPale }}>
        <CircleHelp size={16} color={t.violet} /><Text style={{ ...tx(10, t.violetDeep, 700), flex: 1 }}>برای بازکردن تنظیمات اعلان یا تمام‌صفحه</Text><ChevronLeft size={16} color={t.violet} />
      </Pressable>
      {message ? <Text style={{ ...tx(10, t.warning), lineHeight: '18px' }}>{message}</Text> : null}
      <View style={{ paddingTop: 15, paddingRight: 15, paddingBottom: 15, paddingLeft: 15, background: '#F1EEF7', borderRadius: 16 }}>
        <Text style={tx(12, t.ink, 700)}>نکته‌ی دریافت تماس</Text><Text style={{ ...tx(11, t.inkSoft), lineHeight: '20px', marginTop: 6 }}>در صورت محدودبودن FCM یا مجوز اعلان، سرویس foreground هنگام آنلاین‌بودن صف را بررسی می‌کند. پس از Force stop، Android اجرای سرویس و دریافت اعلان را متوقف می‌کند.</Text>
      </View>
      <View style={{ marginTop: 5 }}>
        <Text style={{ ...tx(10, t.violet, 800), marginBottom: 9 }}>نشست امن</Text>
        <Pressable onPress={() => setMessage('خروج امن به نشست واقعی متصل نیست؛ در پیش‌نمایش هیچ داده‌ای پاک نشد.')} style={{ minHeight: 50, display: 'flex', flexDirection: 'row-reverse', alignItems: 'center', gap: 9, paddingLeft: 13, paddingRight: 13, border: `1px solid #F0D8DE`, borderRadius: 14, background: t.surface }}>
          <LogOut size={17} color={t.danger} /><Text style={{ ...tx(11, t.danger, 700), flex: 1 }}>خروج امن</Text><ChevronLeft size={15} color={t.inkSoft} />
        </Pressable>
      </View>
      <View style={{ marginTop: 'auto', paddingTop: 13, borderTop: `1px solid ${t.line}`, display: 'flex', flexDirection: 'row-reverse', justifyContent: 'space-around' }}>
        <Text style={tx(10, t.inkSoft)}>خانه</Text><Text style={tx(10, t.inkSoft)}>گزارش</Text><Text style={tx(10, t.violet, 800)}>حساب</Text>
      </View>
    </ScrollView>
  </View>;
}
function Readiness({ icon, title, detail, last }: { icon: React.ReactNode; title: string; detail: string; last?: boolean }) {
  return <View style={{ display: 'flex', flexDirection: 'row-reverse', alignItems: 'flex-start', gap: 10, paddingTop: 13, paddingBottom: 13, borderBottom: last ? 'none' : `1px solid ${t.line}` }}>
    <View style={{ width: 34, height: 34, borderRadius: 12, background: '#F4F1F9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</View>
    <View style={{ flex: 1, minWidth: 0 }}><View style={{ display: 'flex', flexDirection: 'row-reverse', justifyContent: 'space-between', gap: 6 }}><Text style={tx(12, t.ink, 700)}>{title}</Text><Text style={tx(10, t.warning)}>بررسی‌نشده</Text></View><Text style={{ ...tx(11, t.inkSoft), lineHeight: '18px', marginTop: 5, maxWidth: '100%', overflowWrap: 'anywhere' }}>{detail}</Text></View>
  </View>;
}
