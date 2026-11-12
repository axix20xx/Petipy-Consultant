import './_group.css';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native-web';
import type { ReactNode } from 'react';
import { Mic, MicOff, Phone, Volume2, Smartphone, Video, MessageCircle, PawPrint, ShieldCheck } from 'lucide-react';
import { petipyTokens as t } from './_shared/tokens';

const copy = (size: number, color: string = t.ink, weight: number = 500): React.CSSProperties => ({ fontFamily: 'Tahoma, sans-serif', direction: 'rtl', textAlign: 'center', fontSize: size, color, fontWeight: weight as any });
type CallReimaginedProps = { remoteVideo?: ReactNode; callerName?: string; petName?: string };
export function CallReimagined({ remoteVideo, callerName = 'نسترن راد', petName = 'لونا' }: CallReimaginedProps) {
  const [muted, setMuted] = useState(false);
  const [speaker, setSpeaker] = useState(false);
  const control = (active: boolean) => ({ flex: 1, minWidth: 0, height: 68, borderRadius: 20, border: `1px solid ${active ? '#D8CCF6' : t.line}`, background: active ? t.violetPale : t.surface, display: 'flex', flexDirection: 'column' as const, alignItems: 'center' as const, justifyContent: 'center' as const, gap: 6, color: t.ink });
  return <View style={{ minHeight: '100dvh', background: t.background, direction: 'rtl', fontFamily: 'Tahoma, sans-serif' }}>
    <View style={{ minHeight: 844, maxWidth: 390, marginLeft: 'auto', marginRight: 'auto', paddingTop: 21, paddingRight: 20, paddingBottom: 18, paddingLeft: 20, boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
      <View style={{ display: 'flex', flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ display: 'flex', flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}><View style={{ width: 33, height: 33, borderRadius: 12, background: t.violet, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><PawPrint color="white" size={17} /></View><View><Text style={{ ...copy(12, t.ink, 800), textAlign: 'right' }}>پتی‌پای</Text><Text style={{ ...copy(9, t.inkSoft), textAlign: 'right', marginTop: 2 }}>تماس مشاوره‌ی خصوصی</Text></View></View>
        <Pressable onPress={() => {}} style={{ borderRadius: 13, background: t.violetPale, padding: '10px 12px', display: 'flex', flexDirection: 'row-reverse', gap: 6, alignItems: 'center' }}><MessageCircle size={16} color={t.violet} /><Text style={copy(10, t.violetDeep, 700)}>گفت‌وگو</Text></Pressable>
      </View>
      <View style={{ marginTop: 18, display: 'flex', flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', padding: '11px 12px', borderRadius: 15, background: t.surface, border: `1px solid ${t.line}` }}>
        <View style={{ display: 'flex', flexDirection: 'row-reverse', alignItems: 'center', gap: 7 }}><View style={{ width: 7, height: 7, borderRadius: 6, background: t.warning }} /><Text style={{ ...copy(10, t.ink, 700), textAlign: 'right' }}>اتصال برقرار نشده</Text></View>
        <View style={{ display: 'flex', flexDirection: 'row-reverse', alignItems: 'center', gap: 7 }}><Text style={{ ...copy(10, t.inkSoft), textAlign: 'right' }}>مدت تماس</Text><Text style={{ ...copy(16, t.ink, 800), fontVariantNumeric: 'tabular-nums' }}>۰۰:۰۰</Text></View>
      </View>
      <View style={{ marginTop: 14, minHeight: 360, borderRadius: 27, background: '#EEE9FA', border: `1px solid ${t.line}`, overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
        {remoteVideo ? (
          <View style={{ position: 'absolute', inset: 0, background: '#302747', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {remoteVideo}
            <View style={{ position: 'absolute', top: 14, right: 14, display: 'flex', flexDirection: 'row-reverse', alignItems: 'center', gap: 5, background: 'rgba(255,255,255,.92)', borderRadius: 20, padding: '7px 10px' }}><Video size={14} color={t.violet} /><Text style={copy(10, t.violetDeep, 700)}>تصویر زنده‌ی تماس</Text></View>
          </View>
        ) : (
          <>
            <View style={{ position: 'absolute', top: 15, right: 15, display: 'flex', flexDirection: 'row-reverse', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,.86)', borderRadius: 20, padding: '7px 10px' }}><Volume2 size={15} color={t.violet} /><Text style={copy(10, t.violetDeep, 700)}>حالت صوتی</Text></View>
            <View style={{ width: 198, height: 198, borderRadius: 99, border: '1px solid #D5C9F0', background: '#E6DFF6', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
              <View style={{ position: 'absolute', width: 164, height: 164, borderRadius: 99, border: '1px solid #D9D0ED', background: '#EEE9FA' }} />
              <View style={{ width: 116, height: 116, borderRadius: 40, background: t.violet, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}>
                <Text style={{ ...copy(47, 'white', 700), lineHeight: '58px' }}>ن</Text>
              </View>
            </View>
            <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 35, marginTop: 19 }}>
              {[14, 23, 32, 19, 28, 16, 25].map((height, index) => <View key={index} style={{ width: 4, height, borderRadius: 5, background: index === 3 ? t.violet : '#B7A7E0' }} />)}
            </View>
            <Text style={{ ...copy(19, t.ink, 800), marginTop: 13 }}>صدای طرف تماس</Text>
            <Text style={{ ...copy(12, t.inkSoft), marginTop: 6 }}>تصویر زنده‌ای دریافت نشده است</Text>
          </>
        )}
        <View style={{ position: 'absolute', bottom: 13, right: 13, display: 'flex', flexDirection: 'row-reverse', alignItems: 'center', gap: 5, background: t.surface, padding: '7px 10px', borderRadius: 12 }}><ShieldCheck size={14} color={t.success} /><Text style={copy(10, t.inkSoft)}>تماس امن</Text></View>
      </View>
      <View style={{ display: 'flex', flexDirection: 'row-reverse', alignItems: 'center', gap: 10, marginTop: 12, padding: '11px 12px', borderRadius: 15, background: t.surface, border: `1px solid ${t.line}` }}>
        <View style={{ width: 39, height: 39, borderRadius: 14, background: t.violetPale, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><PawPrint size={19} color={t.violet} /></View>
        <View style={{ flex: 1, minWidth: 0, alignItems: 'flex-end' }}>
          <Text style={{ ...copy(13, t.ink, 800), textAlign: 'right', width: '100%' }}>{callerName}</Text>
          <Text style={{ ...copy(10, t.inkSoft), textAlign: 'right', width: '100%', marginTop: 3 }}>مشاوره برای {petName} · گربه</Text>
        </View>
      </View>
      <Text style={{ ...copy(9, t.warning), minHeight: 18, marginTop: 8 }}>حالت صوتی · اتصال برقرار نشده</Text>
      <View style={{ display: 'flex', flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', gap: 6, marginTop: 9 }}>
        <Pressable onPress={() => setMuted(!muted)} style={control(muted)}>{muted ? <MicOff size={20} color={t.violet} /> : <Mic size={20} color={t.violet} />}<Text style={copy(9)}>{muted ? 'بی‌صدا' : 'میکروفون'}</Text></Pressable>
        <Pressable onPress={() => setSpeaker(!speaker)} style={control(speaker)}>{speaker ? <Volume2 size={20} color={t.violet} /> : <Smartphone size={20} color={t.violet} />}<Text style={copy(9)}>{speaker ? 'بلندگو' : 'گوشی'}</Text></Pressable>
        <Pressable onPress={() => setSpeaker(!speaker)} style={control(speaker)}><Volume2 size={20} color={t.violet} /><Text style={copy(9)}>بلندگو</Text></Pressable>
      </View>
      <Pressable onPress={() => {}} style={{ minHeight: 58, borderRadius: 17, background: t.danger, marginTop: 13, display: 'flex', flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 8 }}><Phone size={19} color="white" style={{ transform: 'rotate(135deg)' }} /><Text style={copy(13, 'white', 800)}>پایان تماس</Text></Pressable>
    </View>
  </View>;
}
