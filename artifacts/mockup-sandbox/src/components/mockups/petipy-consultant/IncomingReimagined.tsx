import './_group.css';
import { Pressable, Text, View } from 'react-native-web';
import { Clock3, PawPrint, Phone, ShieldCheck, X } from 'lucide-react';
import { petipyTokens as t } from './_shared/tokens';

const txt = (size: number, color: string = t.ink, weight: number = 500): React.CSSProperties => ({ fontFamily: 'Tahoma, sans-serif', direction: 'rtl', textAlign: 'center', fontSize: size, color, fontWeight: weight as any });
export function IncomingReimagined() {
  return <View style={{ minHeight: '100dvh', background: '#F7F4FF', direction: 'rtl', fontFamily: 'Tahoma, sans-serif', display: 'flex', justifyContent: 'center' }}>
    <View style={{ minHeight: 844, width: '100%', maxWidth: 390, marginLeft: 'auto', marginRight: 'auto', boxSizing: 'border-box', paddingTop: 26, paddingRight: 24, paddingBottom: 25, paddingLeft: 24, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <View style={{ width: '100%', display: 'flex', flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ display: 'flex', flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}><View style={{ width: 30, height: 30, borderRadius: 11, background: t.violet, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><PawPrint size={16} color="white" /></View><Text style={{ ...txt(12, t.violet, 800), textAlign: 'right' }}>پتی‌پای · میز مشاوره</Text></View>
        <Text style={{ ...txt(10, t.inkSoft), textAlign: 'left' }}>تماس ورودی</Text>
      </View>
      <View style={{ width: '100%', marginTop: 30, minHeight: 92, boxSizing: 'border-box', borderRadius: 20, background: t.violetDeep, paddingTop: 13, paddingRight: 15, paddingBottom: 13, paddingLeft: 15, display: 'flex', flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ ...txt(11, '#E5DCFA', 700), textAlign: 'right' }}>مهلت پاسخ</Text>
          <Text style={{ ...txt(23, 'white', 800), textAlign: 'right', marginTop: 4 }}>۴:۱۸</Text>
        </View>
        <View style={{ width: 54, height: 54, borderRadius: 18, background: 'rgba(255,255,255,.14)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Clock3 size={25} color="white" /></View>
        <Text style={{ ...txt(10, '#E5DCFA'), maxWidth: 75, lineHeight: '16px' }}>تا پایان فرصت پاسخ</Text>
      </View>
      <View style={{ width: '100%', marginTop: 25, display: 'flex', flexDirection: 'row-reverse', alignItems: 'center', gap: 13 }}>
        <View style={{ width: 62, height: 62, flexShrink: 0, borderRadius: 22, background: t.violetPale, border: '1px solid #DED5F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><PawPrint size={29} color={t.violet} /></View>
        <View style={{ flex: 1, minWidth: 0, alignItems: 'flex-end' }}>
          <Text style={{ ...txt(10, t.violet, 700), textAlign: 'right' }}>درخواست مشاوره‌ی تازه</Text>
          <Text style={{ ...txt(27, t.ink, 800), textAlign: 'right', marginTop: 4, maxWidth: '100%', overflowWrap: 'anywhere' }}>نسترن راد</Text>
          <Text style={{ ...txt(13, t.inkSoft), textAlign: 'right', marginTop: 4 }}>برای لونا · گربه</Text>
        </View>
      </View>
      <View style={{ marginTop: 21, paddingTop: 13, paddingRight: 14, paddingBottom: 14, paddingLeft: 14, background: t.surface, border: `1px solid ${t.line}`, borderRadius: 17, width: '100%', boxSizing: 'border-box' }}>
        <Text style={{ ...txt(10, t.inkSoft), textAlign: 'right' }}>موضوع درخواست</Text><Text style={{ ...txt(15, t.ink, 700), textAlign: 'right', marginTop: 7, maxWidth: '100%', overflowWrap: 'anywhere' }}>بی‌اشتهایی از دیشب</Text>
      </View>
      <View style={{ width: '100%', marginTop: 13, display: 'flex', flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
        <ShieldCheck size={15} color={t.warning} /><Text style={{ ...txt(11, t.inkSoft), textAlign: 'right' }}>در انتظار پاسخ</Text>
      </View>
      <View style={{ marginTop: 'auto', width: '100%', display: 'flex', flexDirection: 'row-reverse', gap: 12 }}>
        <Pressable onPress={() => {}} style={{ flex: 1, minHeight: 64, borderRadius: 19, border: `1px solid ${t.line}`, background: t.surface, display: 'flex', flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 7 }}><X size={19} color={t.danger} /><Text style={txt(14, t.danger, 700)}>رد تماس</Text></Pressable>
        <Pressable onPress={() => {}} style={{ flex: 1.35, minHeight: 64, borderRadius: 19, background: t.violet, display: 'flex', flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 9 }}><Phone size={21} color="white" /><Text style={txt(15, 'white', 800)}>پاسخ به تماس</Text></Pressable>
      </View>
    </View>
  </View>;
}
