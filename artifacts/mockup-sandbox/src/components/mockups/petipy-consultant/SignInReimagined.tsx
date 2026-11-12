import './_group.css';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native-web';
import { ArrowLeft, LockKeyhole, PawPrint, ShieldCheck, FlaskConical } from 'lucide-react';
import { petipyTokens as t } from './_shared/tokens';

const label: React.CSSProperties = { fontFamily: 'Tahoma, sans-serif', direction: 'rtl', textAlign: 'right', color: t.ink };
export function SignInReimagined() {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [notice, setNotice] = useState('');
  return <View style={{ minHeight: '100dvh', background: t.background, fontFamily: 'Tahoma, sans-serif', direction: 'rtl', display: 'flex', justifyContent: 'center' }}>
    <View style={{ width: '100%', maxWidth: 390, minHeight: 844, margin: '0 auto', padding: '26px 25px 22px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      <View>
        <View style={{ display: 'flex', flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ display: 'flex', flexDirection: 'row-reverse', alignItems: 'center', gap: 9 }}><View style={{ width: 38, height: 38, borderRadius: 14, background: t.violet, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><PawPrint size={20} color="white" /></View><Text style={{ ...label, fontSize: 14, fontWeight: 800 }}>پتی‌پای</Text></View>
          <View style={{ display: 'flex', flexDirection: 'row-reverse', gap: 6, alignItems: 'center', background: t.surface, border: `1px solid ${t.line}`, borderRadius: 30, padding: '8px 11px' }}><ShieldCheck size={14} color={t.violet} /><Text style={{ ...label, fontSize: 10, color: t.violetDeep }}>ورود مشاور</Text></View>
        </View>
        <View style={{ marginTop: 56, marginBottom: 28 }}>
          <Text style={{ ...label, fontSize: 11, color: t.violet, fontWeight: 800, marginBottom: 9 }}>فضای اختصاصی متخصصان حیوانات خانگی</Text>
          <Text style={{ ...label, fontSize: 31, fontWeight: 800, lineHeight: '42px' }}>به میز مشاوره{'\n'}خوش آمدید.</Text>
          <Text style={{ ...label, fontSize: 12, color: t.inkSoft, lineHeight: '22px', marginTop: 9 }}>ورود فقط برای حساب فعال مشاور صوتی پتی‌پای امکان‌پذیر است.</Text>
        </View>
        <View style={{ background: '#F0EBFB', borderRight: `3px solid ${t.violet}`, borderRadius: '15px 8px 8px 15px', padding: 13, display: 'flex', flexDirection: 'row-reverse', alignItems: 'flex-start', gap: 10, marginBottom: 25 }}>
          <FlaskConical size={18} color={t.violetDeep} style={{ flexShrink: 0, marginTop: 1 }} />
          <Text style={{ ...label, fontSize: 11, lineHeight: '20px', color: t.violetDeep, flex: 1 }}>ورود آزمایشی توسعه‌ای؛ این کد فقط در صورت فعال بودن احراز هویت توسعه روی سرور پذیرفته می‌شود. این صفحه به ورود زنده وصل نیست.</Text>
        </View>
        <Text style={{ ...label, fontSize: 13, fontWeight: 800, marginBottom: 17 }}>مشخصات حساب مشاور</Text>
        <form onSubmit={(event) => event.preventDefault()} autoComplete="off" style={{ margin: 0 }}>
          <Text style={{ ...label, fontSize: 10, fontWeight: 700, marginBottom: 7 }}>شماره موبایل</Text>
          <View style={{ height: 54, border: `1px solid ${t.line}`, borderRadius: 15, background: t.surface, display: 'flex', flexDirection: 'row-reverse', alignItems: 'center', gap: 10, padding: '0 14px', marginBottom: 17 }}>
            <Text style={{ color: t.inkSoft, fontSize: 18 }}>۰۹</Text>
            <TextInput value={phone} onChangeText={setPhone} placeholder="شماره موبایل حساب مشاور" placeholderTextColor={t.inkSoft} keyboardType="phone-pad" textAlign="left" style={{ flex: 1, border: 'none', outline: 'none', fontSize: 14, color: t.ink, background: 'transparent', fontFamily: 'Tahoma, sans-serif' }} />
          </View>
          <View style={{ display: 'flex', flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}><Text style={{ ...label, fontSize: 10, fontWeight: 700 }}>کد توسعه‌ای ۶ رقمی</Text><Text style={{ ...label, fontSize: 9, color: t.inkSoft }}>فقط برای توسعه</Text></View>
          <View style={{ height: 54, border: `1px solid ${t.line}`, borderRadius: 15, background: t.surface, display: 'flex', flexDirection: 'row-reverse', alignItems: 'center', gap: 10, padding: '0 14px' }}>
            <LockKeyhole size={17} color={t.inkSoft} />
            <TextInput value={code} onChangeText={(v: string) => setCode(v.replace(/\D/g, '').slice(0, 6))} placeholder="—  —  —  —  —  —" placeholderTextColor="#B9B4C6" keyboardType="number-pad" secureTextEntry maxLength={6} textAlign="center" style={{ flex: 1, border: 'none', outline: 'none', fontSize: 16, color: t.ink, background: 'transparent', letterSpacing: 6 }} />
          </View>
        </form>
        <View style={{ display: 'flex', flexDirection: 'row-reverse', alignItems: 'center', gap: 7, marginTop: 15 }}><LockKeyhole size={14} color={t.success} /><Text style={{ ...label, fontSize: 10, color: t.inkSoft }}>نشست امن دستگاه پس از ورود واقعی در SecureStore ذخیره می‌شود.</Text></View>
        <Pressable onPress={() => setNotice('این پیش‌نمایش به سرویس احراز هویت متصل نیست؛ هیچ ورود یا نشستی ایجاد نشد.')} style={{ marginTop: 22, minHeight: 54, borderRadius: 16, background: t.violet, display: 'flex', flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 9 }}>
          <Text style={{ ...label, color: 'white', fontSize: 13, fontWeight: 800 }}>ورود به میز مشاوره</Text><ArrowLeft size={17} color="white" />
        </Pressable>
        {notice ? <Text style={{ ...label, fontSize: 10, color: t.warning, marginTop: 11, lineHeight: '18px' }}>{notice}</Text> : null}
        <View style={{ marginTop: 20, padding: 13, background: t.surface, border: `1px solid ${t.line}`, borderRadius: 15 }}>
          <Text style={{ ...label, fontSize: 10, color: t.inkSoft, lineHeight: '18px' }}>ورود موبایلی زنده هنوز به Petipy متصل نیست. دسترسی حساب و نقش VOICE_CONSULTANT را سرویس رسمی تأیید می‌کند.</Text>
        </View>
      </View>
      <Text style={{ ...label, fontSize: 10, color: t.inkSoft, textAlign: 'center' }}>همراهِ مراقبت بهتر از حیوانات خانگی</Text>
    </View>
  </View>;
}
