import './_group.css';
import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native-web';
import { ArrowRight, FileText, Image, LockKeyhole, Paperclip, Send, ShieldCheck } from 'lucide-react';
import { petipyTokens as t } from './_shared/tokens';

const tx = (size: number, color: string = t.ink, weight: number = 500): React.CSSProperties => ({ fontFamily: 'Tahoma, sans-serif', direction: 'rtl', textAlign: 'right', fontSize: size, color, fontWeight: weight as any });
export function ChatReimagined() {
  const [draft, setDraft] = useState('');
  const [message, setMessage] = useState('');
  const [attached, setAttached] = useState(true);
  return <View style={{ minHeight: '100dvh', background: t.background, direction: 'rtl', fontFamily: 'Tahoma, sans-serif', display: 'flex', justifyContent: 'center' }}>
    <View style={{ minHeight: 844, maxWidth: 390, width: '100%', marginLeft: 'auto', marginRight: 'auto', display: 'flex', flexDirection: 'column', boxSizing: 'border-box', background: t.background }}>
      <View style={{ paddingTop: 18, paddingRight: 17, paddingBottom: 12, paddingLeft: 17, background: t.surface, borderBottom: `1px solid ${t.line}` }}>
        <View style={{ display: 'flex', flexDirection: 'row-reverse', alignItems: 'center', gap: 10 }}>
          <Pressable onPress={() => setMessage('اتصال تماس برقرار نیست.')} style={{ width: 44, height: 44, borderRadius: 14, background: t.violetPale, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ArrowRight size={19} color={t.violet} /></Pressable>
          <View style={{ flex: 1, minWidth: 0 }}><Text style={tx(15, t.ink, 800)}>گفت‌وگوی تماس</Text><Text style={{ ...tx(10, t.inkSoft), marginTop: 3 }}>همراهِ تماس مشاوره</Text></View>
          <View style={{ padding: '7px 9px', background: '#F1EEF7', borderRadius: 10 }}><Text style={tx(9, t.inkSoft)}>۰۱:۱۲</Text></View>
        </View>
        <View style={{ display: 'flex', flexDirection: 'row-reverse', alignItems: 'center', gap: 6, marginTop: 12, padding: '8px 10px', borderRadius: 11, background: t.surfaceQuiet }}>
          <LockKeyhole size={13} color={t.success} /><Text style={{ ...tx(9, t.inkSoft), flex: 1 }}>پیام‌ها و فایل‌های همین تماس</Text><Text style={tx(9, t.violetDeep, 700)}>خصوصی</Text>
        </View>
        <Pressable onPress={() => setMessage('اتصال تماس برقرار نیست.')} style={{ marginTop: 10, minHeight: 44, display: 'flex', flexDirection: 'row-reverse', alignItems: 'center', gap: 7, justifyContent: 'center', border: `1px solid ${t.line}`, borderRadius: 12 }}>
          <ArrowRight size={15} color={t.violet} /><Text style={tx(10, t.violet, 700)}>بازگشت به تماس</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingTop: 17, paddingRight: 20, paddingBottom: 17, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 14, boxSizing: 'border-box' }}>
        <Text style={{ ...tx(10, t.inkSoft), textAlign: 'center' }}>امروز · گفت‌وگو</Text>
        <View style={{ alignSelf: 'flex-start', minWidth: 0, maxWidth: '88%', boxSizing: 'border-box', paddingTop: 12, paddingRight: 13, paddingBottom: 12, paddingLeft: 13, background: t.surface, border: `1px solid ${t.line}`, borderRadius: '17px 17px 17px 6px' }}>
          <Text style={{ ...tx(13, t.ink), lineHeight: '22px', maxWidth: '100%', overflowWrap: 'anywhere' }}>سلام، عکس پرونده‌ی لونا را هم فرستادم. از دیشب غذایش را کامل نخورده.</Text><Text style={{ ...tx(10, t.inkSoft), marginTop: 7 }}>۱۴:۰۹</Text>
        </View>
        <View style={{ alignSelf: 'flex-end', minWidth: 0, maxWidth: '88%', boxSizing: 'border-box', paddingTop: 12, paddingRight: 13, paddingBottom: 12, paddingLeft: 13, background: t.violet, borderRadius: '17px 17px 6px 17px' }}>
          <Text style={{ ...tx(13, 'white'), lineHeight: '22px', maxWidth: '100%', overflowWrap: 'anywhere' }}>ممنون. لطفاً اگر بی‌حالی یا استفراغ هم داشته، برایم بنویسید.</Text><Text style={{ ...tx(10, '#E5DCFA'), marginTop: 7 }}>۱۴:۱۰</Text>
        </View>
        <View style={{ alignSelf: 'flex-start', minWidth: 0, maxWidth: '88%', boxSizing: 'border-box', paddingTop: 11, paddingRight: 11, paddingBottom: 11, paddingLeft: 11, background: t.surface, border: `1px solid ${t.line}`, borderRadius: '17px 17px 17px 6px' }}>
          <Text style={{ ...tx(12, t.ink), lineHeight: '20px', maxWidth: '100%', overflowWrap: 'anywhere' }}>بله، تصویر را ببینید.</Text>
          {attached ? <Pressable onPress={() => setMessage('فایل در دسترس نیست.')} style={{ width: '100%', maxWidth: '100%', minWidth: 0, boxSizing: 'border-box', marginTop: 8, overflow: 'hidden', borderRadius: 13, border: `1px solid ${t.line}`, background: '#F5F2FA' }}>
            <View style={{ height: 119, background: '#EAE6F1', padding: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
              <View style={{ width: 88, height: 96, background: 'white', borderRadius: 4, padding: 10, boxShadow: '0 3px 9px rgba(48,39,71,.08)' }}>
                <View style={{ height: 5, width: 38, background: '#C5B6ED', borderRadius: 4, marginBottom: 8, marginRight: 'auto' }} />
                <View style={{ height: 3, background: '#E7E3EF', borderRadius: 4, marginBottom: 5 }} /><View style={{ height: 3, width: '70%', background: '#E7E3EF', borderRadius: 4, marginBottom: 8 }} />
                <View style={{ height: 32, borderBottom: '1px solid #D8CFF0', display: 'flex', flexDirection: 'row', alignItems: 'flex-end', gap: 5, padding: '0 7px' }}><View style={{ height: 15, width: 9, background: '#9E85DC', borderRadius: 3 }} /><View style={{ height: 24, width: 9, background: '#B7A5E7', borderRadius: 3 }} /><View style={{ height: 19, width: 9, background: '#D0C4EF', borderRadius: 3 }} /></View>
              </View>
              <View style={{ position: 'absolute', top: 8, right: 8, display: 'flex', flexDirection: 'row-reverse', alignItems: 'center', gap: 4, borderRadius: 20, background: 'rgba(255,255,255,.92)', padding: '5px 7px' }}><ShieldCheck size={12} color={t.success} /><Text style={tx(8, t.inkSoft)}>نمایش امن درون برنامه</Text></View>
            </View>
            <View style={{ display: 'flex', flexDirection: 'row-reverse', alignItems: 'center', gap: 8, paddingTop: 9, paddingRight: 10, paddingBottom: 9, paddingLeft: 10, minWidth: 0, boxSizing: 'border-box' }}><Image size={16} color={t.violet} /><View style={{ flex: 1, minWidth: 0 }}><Text style={{ ...tx(11, t.ink, 700), maxWidth: '100%', overflowWrap: 'anywhere' }}>پرونده‌ی لونا.jpg</Text><Text style={{ ...tx(10, t.inkSoft), marginTop: 3, maxWidth: '100%', overflowWrap: 'anywhere' }}>پیوست تصویر · ۱٫۸ مگابایت</Text></View><ArrowRight size={14} color={t.inkSoft} /></View>
          </Pressable> : <View style={{ marginTop: 8, display: 'flex', flexDirection: 'row-reverse', gap: 7, alignItems: 'center', background: t.violetPale, padding: 9, borderRadius: 11 }}><FileText size={16} color={t.violet} /><Text style={tx(9, t.inkSoft)}>پیوست از پیام حذف شد</Text></View>}
          <Text style={{ ...tx(8, t.inkSoft), marginTop: 7 }}>۱۴:۱۲</Text>
        </View>
        {message ? <Text style={{ ...tx(9, t.warning), textAlign: 'center', lineHeight: '17px' }}>{message}</Text> : null}
      </ScrollView>
      <View style={{ paddingTop: 8, paddingRight: 12, paddingBottom: 14, paddingLeft: 12, background: t.surface, borderTop: `1px solid ${t.line}` }}>
        <View style={{ minHeight: 94, border: `1px solid ${t.line}`, borderRadius: 17, paddingTop: 4, paddingRight: 10, paddingBottom: 9, paddingLeft: 10, background: t.surfaceQuiet }}>
          <TextInput value={draft} onChangeText={setDraft} multiline maxLength={4000} placeholder="پیامت را بنویس…" placeholderTextColor={t.inkSoft} textAlign="right" style={{ minHeight: 46, maxHeight: 70, fontFamily: 'Tahoma, sans-serif', fontSize: 12, color: t.ink, border: 'none', outline: 'none', background: 'transparent', direction: 'rtl' }} />
          <View style={{ display: 'flex', flexDirection: 'row-reverse', alignItems: 'center', borderTop: `1px solid ${t.line}`, paddingTop: 8 }}>
            <Pressable onPress={() => setAttached(!attached)} style={{ display: 'flex', flexDirection: 'row-reverse', alignItems: 'center', gap: 5, padding: '7px 9px', borderRadius: 10, background: t.violetPale }}><Paperclip size={14} color={t.violet} /><Text style={tx(10, t.violetDeep, 700)}>افزودن پیوست</Text></Pressable>
            <Text style={{ ...tx(8, t.inkSoft), marginRight: 8, flex: 1 }}>تصویر یا PDF · حداکثر ۲۵ مگابایت</Text>
            <Pressable onPress={() => { if (draft.trim()) setMessage('اتصال گفت‌وگو برقرار نیست.'); }} style={{ width: 40, height: 40, borderRadius: 12, background: t.violet, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Send size={15} color="white" /></Pressable>
          </View>
        </View>
      </View>
    </View>
  </View>;
}
