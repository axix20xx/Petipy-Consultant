import './_group.css';
import { Pressable, ScrollView, Text, View } from 'react-native-web';
import { Bell, ChevronLeft, Clock3, PawPrint, Phone, RefreshCw, ShieldCheck, Signal, UserRound } from 'lucide-react';
import { petipyTokens as t } from './_shared/tokens';

const fa = (size: number, color: string = t.ink, weight: number = 500) => ({ color, fontSize: size, fontWeight: weight as any, textAlign: 'right' as const, writingDirection: 'rtl' as const, fontFamily: 'Tahoma, Arial, sans-serif' });
const row = { flexDirection: 'row-reverse' as const, alignItems: 'center' as const };
const base: React.CSSProperties = { minHeight: '100dvh', background: t.background, color: t.ink, direction: 'rtl', fontFamily: 'Tahoma, Arial, sans-serif' };

export function HomeReimagined() {
  return <View style={base}>
    <ScrollView contentContainerStyle={{ width: '100%', maxWidth: 390, minHeight: 844, marginLeft: 'auto', marginRight: 'auto', paddingTop: 20, paddingRight: 22, paddingBottom: 26, paddingLeft: 22, boxSizing: 'border-box', gap: 15, display: 'flex', flexDirection: 'column' }}>
      <View style={{ ...row, justifyContent: 'space-between' }}>
        <View style={{ ...row, gap: 10 }}>
          <View style={{ width: 38, height: 38, borderRadius: 14, background: t.violet, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><PawPrint size={20} color="white" /></View>
          <View style={{ alignItems: 'flex-end' }}><Text style={fa(15, t.ink, 800)}>پتی‌پای</Text><Text style={fa(10, t.inkSoft)}>میز مشاوره</Text></View>
        </View>
        <View style={{ ...row, gap: 7, paddingTop: 8, paddingRight: 10, paddingBottom: 8, paddingLeft: 10, background: t.surface, borderRadius: 14, border: `1px solid ${t.line}` }}>
          <View style={{ width: 7, height: 7, borderRadius: 9, background: t.warning }} />
          <Text style={fa(10, t.ink, 700)}>وضعیت دستگاه بررسی‌نشده</Text>
        </View>
      </View>

      <View style={{ ...row, justifyContent: 'space-between', paddingTop: 11, paddingBottom: 11, borderTop: `1px solid ${t.line}`, borderBottom: `1px solid ${t.line}` }}>
        <View style={{ ...row, gap: 8 }}>
          <View style={{ width: 24, height: 24, borderRadius: 9, background: '#F4F1F9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Signal size={13} color={t.warning} /></View>
          <Text style={fa(11, t.ink, 700)}>دسترسی مشاور: نامشخص</Text>
        </View>
        <Text style={fa(10, t.inkSoft)}>{new Intl.DateTimeFormat('fa-IR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())}</Text>
      </View>
      <View style={{ ...row, gap: 8, paddingVertical: 8 }}>
        <Signal size={16} color={t.warning} /><Text style={{ ...fa(10, t.inkSoft), flex: 1 }}>سرویس پس‌زمینه: بررسی‌نشده</Text>
        <Bell size={15} color={t.warning} /><Text style={fa(10, t.inkSoft)}>اعلان FCM: بررسی‌نشده</Text><ChevronLeft size={15} color={t.violet} />
      </View>

      <View style={{ ...row, justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 3 }}>
        <View style={{ alignItems: 'flex-end', gap: 3 }}><Text style={fa(12, t.violet, 800)}>صف مشاوره</Text><Text style={fa(23, t.ink, 800)}>درخواست‌های ورودی</Text></View>
        <Pressable accessibilityLabel="تازه‌سازی صف" onPress={() => {}} style={{ width: 44, height: 44, borderRadius: 14, background: t.surface, border: `1px solid ${t.line}`, alignItems: 'center', justifyContent: 'center' }}><RefreshCw size={17} color={t.violet} /></Pressable>
      </View>
      <View style={{ ...row, justifyContent: 'space-between', marginTop: -8 }}>
        <View style={{ ...row, gap: 7 }}><View style={{ background: t.violetPale, borderRadius: 10, padding: '4px 9px' }}><Text style={fa(12, t.violetDeep, 800)}>۲</Text></View><Text style={fa(10, t.inkSoft)}>در انتظار پاسخ</Text></View>
        <Text style={fa(9, t.inkSoft)}>منتظر پاسخ شما</Text>
      </View>

      <View style={{ width: '100%', minWidth: 0, boxSizing: 'border-box', background: t.violet, borderRadius: 26, paddingTop: 18, paddingRight: 17, paddingBottom: 15, paddingLeft: 17, color: 'white', overflow: 'hidden', position: 'relative' }}>
        <View style={{ position: 'absolute', left: -26, top: -35, width: 115, height: 115, borderRadius: 99, border: '1px solid rgba(255,255,255,.18)' }} />
        <View style={{ ...row, justifyContent: 'space-between', marginBottom: 17 }}>
          <View style={{ ...row, gap: 6, background: 'rgba(255,255,255,.16)', padding: '6px 9px', borderRadius: 12 }}><Clock3 size={14} color="white" /><Text style={fa(11, 'white', 800)}>۶ دقیقه مانده</Text></View>
          <Text style={fa(10, '#E8E0FF', 700)}>درخواست تازه · ۱۴:۳۲</Text>
        </View>
        <View style={{ ...row, gap: 12, alignItems: 'flex-start', minWidth: 0 }}>
          <View style={{ width: 52, height: 52, flexShrink: 0, borderRadius: 19, background: '#E9E2FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><PawPrint size={27} color={t.violet} /></View>
          <View style={{ flex: 1, minWidth: 0, alignItems: 'flex-end', gap: 6 }}>
            <Text style={{ ...fa(21, 'white', 800), width: '100%', maxWidth: '100%', flexShrink: 1, whiteSpace: 'normal', overflowWrap: 'anywhere' }}>نسترن راد</Text>
            <Text style={{ ...fa(12, '#E8E0FF'), width: '100%', maxWidth: '100%', flexShrink: 1, whiteSpace: 'normal', overflowWrap: 'anywhere' }}>برای لونا · گربه</Text>
          </View>
        </View>
        <View style={{ ...row, justifyContent: 'flex-start', marginTop: 11 }}>
          <View style={{ borderRadius: 11, background: '#DCD1FF', paddingTop: 6, paddingRight: 9, paddingBottom: 6, paddingLeft: 9, maxWidth: '100%' }}><Text style={{ ...fa(10, t.violetDeep, 700), maxWidth: '100%', flexShrink: 1, whiteSpace: 'normal', overflowWrap: 'anywhere' }}>در انتظار پاسخ</Text></View>
        </View>
        <View style={{ width: '100%', minWidth: 0, boxSizing: 'border-box', borderRight: '2px solid #C9B9FF', marginTop: 16, marginRight: 3, marginBottom: 14, paddingTop: 2, paddingRight: 11, paddingBottom: 2, paddingLeft: 0 }}>
          <Text style={{ ...fa(11, '#DCD4F4'), maxWidth: '100%', flexShrink: 1 }}>موضوع درخواست</Text><Text style={{ ...fa(15, 'white', 700), marginTop: 5, maxWidth: '100%', flexShrink: 1, whiteSpace: 'normal', overflowWrap: 'anywhere' }}>بی‌اشتهایی از دیشب</Text>
        </View>
        <View style={{ ...row, justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 5, marginBottom: 14 }}>
          <Text style={{ ...fa(10, '#E8E0FF'), flex: 1, minWidth: 125, flexShrink: 1, whiteSpace: 'normal', overflowWrap: 'anywhere' }}>ثبت درخواست: ۳ دقیقه پیش</Text><Text style={{ ...fa(10, '#E8E0FF'), flex: 1, minWidth: 105, flexShrink: 1, whiteSpace: 'normal', overflowWrap: 'anywhere' }}>مهلت تا ۱۴:۴۱</Text>
        </View>
        <View style={{ ...row, gap: 9 }}>
          <Pressable onPress={() => {}} style={{ flex: 0.8, minHeight: 56, borderRadius: 16, border: '1px solid rgba(255,255,255,.65)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Text style={fa(13, 'white', 700)}>رد درخواست</Text></Pressable>
          <Pressable onPress={() => {}} style={{ flex: 1.3, minHeight: 56, borderRadius: 16, background: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'row-reverse', gap: 8 }}><Phone size={19} color={t.violet} /><Text style={fa(14, t.violet, 800)}>پاسخ به تماس</Text></Pressable>
        </View>
      </View>

      <View style={{ ...row, justifyContent: 'space-between', marginTop: 2 }}>
        <Text style={fa(14, t.ink, 800)}>در صف بعدی</Text><Text style={fa(9, t.inkSoft)}>۱ درخواست دیگر</Text>
      </View>
      <View style={{ borderTop: `1px solid ${t.line}` }}>
          <View style={{ ...row, paddingTop: 13, paddingRight: 2, paddingBottom: 13, paddingLeft: 2, borderBottom: `1px solid ${t.line}`, gap: 10 }}>
          <View style={{ width: 34, height: 34, borderRadius: 12, background: t.surfaceSoft, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><UserRound size={17} color={t.violet} /></View>
          <View style={{ flex: 1, minWidth: 0, alignItems: 'flex-end', gap: 4 }}><Text style={{ ...fa(12, t.ink, 700), maxWidth: '100%', flexShrink: 1, overflowWrap: 'anywhere' }}>آرمان کاظمی</Text><Text style={{ ...fa(10, t.inkSoft), maxWidth: '100%', flexShrink: 1, overflowWrap: 'anywhere' }}>میشا · بررسی تغذیه</Text></View>
          <Text style={{ ...fa(10, t.inkSoft), maxWidth: 76, flexShrink: 1, overflowWrap: 'anywhere' }}>۸ دقیقه پیش</Text><ChevronLeft size={15} color={t.inkSoft} />
        </View>
      </View>
      <View style={{ ...row, justifyContent: 'space-between', borderTop: `1px solid ${t.line}`, paddingTop: 14, marginTop: 'auto' }}>
        <View style={{ alignItems: 'flex-end', gap: 4 }}><Text style={fa(9, t.inkSoft)}>خلاصه‌ی امروز</Text><View style={{ ...row, gap: 7 }}><Text style={fa(16, t.ink, 800)}>۳</Text><Text style={fa(10, t.inkSoft)}>تماس</Text><View style={{ height: 18, width: 1, background: t.line, margin: '0 4px' }} /><Text style={fa(16, t.ink, 800)}>۴۴</Text><Text style={fa(10, t.inkSoft)}>دقیقه گفت‌وگو</Text></View></View>
        <View style={{ ...row, gap: 6 }}><ShieldCheck size={16} color={t.success} /><Text style={fa(9, t.inkSoft)}>سوابق شخصی</Text></View>
      </View>
      <View style={{ ...row, justifyContent: 'space-around', paddingTop: 12, borderTop: `1px solid ${t.line}` }}>
        <Text style={fa(10, t.violet, 800)}>خانه</Text><Text style={fa(10, t.inkSoft)}>گزارش</Text><Text style={fa(10, t.inkSoft)}>حساب</Text>
      </View>
    </ScrollView>
  </View>;
}
