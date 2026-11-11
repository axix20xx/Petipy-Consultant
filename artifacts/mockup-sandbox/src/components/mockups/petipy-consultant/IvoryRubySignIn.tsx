import './_group.css';

import { useState, type FormEvent } from 'react';
import {
  ArrowLeft,
  Check,
  FlaskConical,
  Heart,
  KeyRound,
  LockKeyhole,
  PawPrint,
  Phone,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

function normalizeDigits(value: string) {
  return value.replace(/[۰-۹٠-٩]/g, (digit) => {
    const fa = '۰۱۲۳۴۵۶۷۸۹'.indexOf(digit);
    const ar = '٠١٢٣٤٥٦٧٨٩'.indexOf(digit);
    return String(fa >= 0 ? fa : ar);
  });
}

export function IvoryRubySignIn() {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [previewNotice, setPreviewNotice] = useState('');
  const ready = phone.trim().length >= 10 && code.length === 6;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPreviewNotice(
      ready
        ? 'این پیش‌نمایش نمایشی است؛ هیچ ورود یا درخواستی به سرور انجام نشد.'
        : 'برای نمایش حالت فرم، شماره موبایل و کد ۶ رقمی را کامل کنید.',
    );
  }

  return (
    <main className="ivory-ruby">
      <style>{`
        .ivory-ruby {
          --ivory: #f7f0e6;
          --paper: #fffdf8;
          --ruby: #9b2342;
          --ruby-deep: #761b35;
          --rose: #f2d8d8;
          --rose-light: #fbebea;
          --ink: #422b2e;
          --muted: #877477;
          --line: #eadbd3;
          --gold: #bc8b52;
          min-height: 100vh;
          width: 100%;
          box-sizing: border-box;
          overflow: hidden;
          position: relative;
          color: var(--ink);
          background:
            radial-gradient(ellipse at 6% 88%, rgba(222, 173, 160, .22), transparent 32%),
            radial-gradient(ellipse at 100% 4%, rgba(190, 137, 105, .12), transparent 30%),
            var(--ivory);
          font-family: "DM Sans", "Noto Sans Arabic", "Segoe UI", sans-serif;
          padding: 27px clamp(22px, 6vw, 90px) 24px;
        }
        .ivory-ruby *, .ivory-ruby *::before, .ivory-ruby *::after { box-sizing: border-box; }
        .ivory-ruby::before {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          opacity: .15;
          background-image: radial-gradient(rgba(112, 71, 63, .25) .55px, transparent .55px);
          background-size: 7px 7px;
          mask-image: linear-gradient(115deg, black, transparent 75%);
        }
        .ir-topbar, .ir-layout { position: relative; z-index: 1; }
        .ir-topbar {
          max-width: 1160px;
          margin: 0 auto;
          display: flex;
          justify-content: space-between;
          align-items: center;
          direction: ltr;
          padding-bottom: 19px;
          border-bottom: 1px solid rgba(155, 35, 66, .12);
        }
        .ir-brand { display: flex; align-items: center; gap: 11px; }
        .ir-brand-mark {
          height: 41px; width: 41px; display: grid; place-items: center;
          color: var(--paper); background: var(--ruby); border-radius: 15px;
          box-shadow: 0 7px 17px rgba(118, 27, 53, .19);
        }
        .ir-brand-name {
          color: var(--ruby-deep); font-size: 17px; font-weight: 850;
          letter-spacing: .11em; line-height: 1;
        }
        .ir-brand-caption {
          color: #9d7c7c; font-size: 9px; font-weight: 700;
          letter-spacing: .2em; margin-top: 5px;
        }
        .ir-topnote {
          color: #916f70; font-size: 11px; letter-spacing: .04em;
          display: flex; gap: 8px; align-items: center;
        }
        .ir-topnote span {
          display: block; height: 7px; width: 7px; border-radius: 50%;
          background: #b7834d; box-shadow: 0 0 0 4px rgba(183, 131, 77, .12);
        }
        .ir-layout {
          max-width: 1120px;
          margin: 0 auto;
          min-height: calc(100vh - 93px);
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(380px, 470px);
          align-items: center;
          gap: clamp(42px, 8vw, 112px);
          padding: 34px 0 18px;
        }
        .ir-story { direction: rtl; text-align: right; padding: 5px 0; }
        .ir-overline {
          display: inline-flex; align-items: center; gap: 8px;
          color: var(--ruby); font-size: 11px; font-weight: 800;
          letter-spacing: .04em; margin-bottom: 20px;
        }
        .ir-overline i { height: 1px; width: 27px; background: var(--gold); }
        .ir-headline {
          font-family: "Noto Naskh Arabic", "Georgia", serif;
          font-size: clamp(37px, 5vw, 62px); line-height: 1.45;
          letter-spacing: -.045em; font-weight: 750; color: #512d37;
          margin: 0; max-width: 560px;
        }
        .ir-headline em { color: var(--ruby); font-style: normal; position: relative; }
        .ir-headline em::after {
          content: ""; position: absolute; height: 8px; border-radius: 50%;
          left: 2%; right: 4%; bottom: 2px; background: rgba(190, 139, 82, .26);
          z-index: -1;
        }
        .ir-intro {
          max-width: 430px; color: #806d70; font-size: 14px;
          line-height: 2.1; margin: 16px 0 26px;
        }
        .ir-promises { display: grid; gap: 12px; max-width: 430px; }
        .ir-promise {
          display: flex; align-items: center; gap: 12px; direction: rtl;
          color: #654b4f; font-size: 12px; font-weight: 650;
        }
        .ir-promise-icon {
          width: 31px; height: 31px; border-radius: 11px;
          display: grid; place-items: center; color: var(--ruby);
          background: #f3e1dd; flex: 0 0 auto;
        }
        .ir-seal {
          margin-top: 33px; display: flex; align-items: center; gap: 11px;
          direction: rtl; color: #a18380; font-size: 10px;
        }
        .ir-seal-mark {
          width: 30px; height: 30px; border: 1px solid #dfc7b8;
          color: var(--ruby); border-radius: 50%; display: grid; place-items: center;
        }
        .ir-card {
          background: var(--paper); border: 1px solid rgba(155, 35, 66, .12);
          border-radius: 28px; padding: 30px 30px 24px;
          box-shadow: 0 22px 60px rgba(91, 49, 50, .1), 0 3px 10px rgba(91, 49, 50, .04);
          position: relative; overflow: hidden;
        }
        .ir-card::before {
          content: ""; position: absolute; top: 0; left: 0; right: 0; height: 5px;
          background: linear-gradient(90deg, #c38c55, #9b2342 48%, #d98a91);
        }
        .ir-card-header {
          display: flex; align-items: center; justify-content: space-between;
          direction: rtl; margin: 2px 0 22px;
        }
        .ir-card-title { text-align: right; }
        .ir-card-title h2 {
          color: #512d37; font-size: 23px; margin: 0 0 6px; font-weight: 800;
          letter-spacing: -.03em; direction: rtl;
        }
        .ir-card-title p { margin: 0; color: var(--muted); font-size: 11px; direction: rtl; }
        .ir-lock {
          height: 45px; width: 45px; flex: 0 0 auto; border-radius: 16px;
          display: grid; place-items: center; color: var(--ruby);
          background: #f8e9e6; border: 1px solid #f0d8d4;
        }
        .ir-role {
          display: inline-flex; align-items: center; gap: 7px; direction: ltr;
          border: 1px solid #eadbd3; border-radius: 999px;
          padding: 6px 9px; margin-top: 12px; color: #846468;
          font: 700 9px/1 "DM Sans", sans-serif; letter-spacing: .07em;
        }
        .ir-role i { width: 6px; height: 6px; background: #b6854c; border-radius: 50%; }
        .ir-dev-alert {
          direction: rtl; display: flex; align-items: flex-start; gap: 10px;
          background: #fbf0e2; border: 1px solid #efdfc9; border-radius: 14px;
          padding: 12px 13px; color: #825d3b; font-size: 10px; line-height: 1.9;
          text-align: right; margin-bottom: 21px;
        }
        .ir-dev-alert svg { flex: 0 0 auto; margin-top: 2px; color: #aa7842; }
        .ir-form { display: grid; gap: 9px; direction: rtl; }
        .ir-label {
          color: #60464a; font-size: 11px; font-weight: 750; text-align: right;
          margin-top: 2px;
        }
        .ir-input-wrap {
          display: flex; align-items: center; gap: 10px; height: 53px;
          padding: 0 14px; border: 1px solid #e7d9d2; border-radius: 14px;
          color: #a17e7c; background: #fffefa; transition: border-color .18s, box-shadow .18s;
        }
        .ir-input-wrap:focus-within { border-color: #b85269; box-shadow: 0 0 0 3px rgba(155, 35, 66, .08); }
        .ir-input-wrap svg { flex: 0 0 auto; }
        .ir-input {
          width: 100%; min-width: 0; border: 0; outline: 0; background: transparent;
          color: #452d31; font: 600 14px/1.4 "DM Sans", "Segoe UI", sans-serif;
        }
        .ir-input::placeholder { color: #c2ada8; font-weight: 450; }
        .ir-code { text-align: center; letter-spacing: .42em; padding-left: .42em; }
        .ir-security {
          display: flex; gap: 8px; align-items: center; direction: rtl;
          color: #90797a; font-size: 10px; line-height: 1.8; margin: 6px 0 4px;
        }
        .ir-security svg { color: #99764d; flex: 0 0 auto; }
        .ir-submit {
          min-height: 52px; border: 0; border-radius: 15px; margin-top: 2px;
          display: flex; justify-content: center; align-items: center; gap: 10px;
          direction: rtl; color: #fff8f0; background: var(--ruby); cursor: pointer;
          font: 750 13px/1 "Noto Sans Arabic", "Segoe UI", sans-serif;
          box-shadow: 0 9px 18px rgba(155, 35, 66, .2); transition: transform .18s, background .18s;
        }
        .ir-submit:hover { background: var(--ruby-deep); transform: translateY(-1px); }
        .ir-submit:focus-visible { outline: 3px solid #d6a5a4; outline-offset: 3px; }
        .ir-submit:disabled { cursor: not-allowed; opacity: .55; box-shadow: none; }
        .ir-feedback {
          direction: rtl; text-align: right; font-size: 10px; line-height: 1.8;
          color: #8d3e4c; background: #fbebea; border: 1px solid #f0d5d4;
          border-radius: 11px; padding: 9px 11px; margin: 2px 0 0;
        }
        .ir-card-foot {
          border-top: 1px solid #f0e7e0; margin-top: 19px; padding-top: 14px;
          color: #a18c88; font-size: 9px; line-height: 1.8; text-align: center; direction: rtl;
        }
        .ir-footer {
          position: relative; z-index: 1; text-align: center; color: #a38b86;
          font-size: 10px; direction: rtl; padding: 9px 0 0;
        }
        .ir-footer svg { vertical-align: -2px; color: var(--ruby); margin: 0 3px; }
        @media (max-width: 800px) {
          .ivory-ruby { padding: 20px 22px 18px; }
          .ir-layout { min-height: auto; grid-template-columns: minmax(0, 1fr); gap: 25px; padding-top: 28px; }
          .ir-story { text-align: center; padding: 0; }
          .ir-overline { margin-bottom: 10px; }
          .ir-headline { max-width: none; font-size: clamp(32px, 8vw, 47px); }
          .ir-intro { margin: 10px auto 16px; font-size: 12px; }
          .ir-promises { display: flex; justify-content: center; flex-wrap: wrap; gap: 9px 18px; margin: auto; }
          .ir-promise { font-size: 10px; }
          .ir-promise-icon { width: 27px; height: 27px; }
          .ir-seal { justify-content: center; margin-top: 16px; }
          .ir-card { width: min(100%, 470px); margin: 0 auto; }
        }
        @media (max-width: 480px) {
          .ivory-ruby { padding: 16px 16px 14px; }
          .ir-topbar { padding-bottom: 14px; }
          .ir-brand-mark { height: 36px; width: 36px; border-radius: 13px; }
          .ir-brand-name { font-size: 14px; }
          .ir-topnote { font-size: 9px; }
          .ir-layout { gap: 20px; padding-top: 22px; }
          .ir-card { padding: 25px 20px 19px; border-radius: 23px; }
          .ir-promises { display: grid; justify-content: center; text-align: right; }
          .ir-headline { line-height: 1.4; }
          .ir-footer { font-size: 9px; }
        }
      `}</style>

      <header className="ir-topbar">
        <div className="ir-brand" aria-label="Petipy Consultant">
          <div className="ir-brand-mark"><PawPrint size={20} strokeWidth={2.2} /></div>
          <div>
            <div className="ir-brand-name">PETIPY</div>
            <div className="ir-brand-caption">CONSULTANT</div>
          </div>
        </div>
        <div className="ir-topnote"><span />فضای اختصاصی مشاوران</div>
      </header>

      <section className="ir-layout">
        <div className="ir-story">
          <div className="ir-overline"><i /> پتی‌پای، کنارِ مراقبتِ شما <Sparkles size={14} /></div>
          <h1 className="ir-headline">دانش شما،<br /><em>آرامشِ یک خانه</em></h1>
          <p className="ir-intro">
            به فضای مشاوره‌ی امن پتی‌پای خوش آمدید؛ جایی برای همراهی دقیق‌تر و مهربانانه‌تر با صاحبان حیوانات خانگی.
          </p>
          <div className="ir-promises">
            <div className="ir-promise"><span className="ir-promise-icon"><Heart size={15} /></span>همراهی با احترام و همدلی</div>
            <div className="ir-promise"><span className="ir-promise-icon"><ShieldCheck size={15} /></span>دسترسی ویژه‌ی مشاوران فعال</div>
          </div>
          <div className="ir-seal">
            <span className="ir-seal-mark"><Check size={15} /></span>
            <span>مراقبت حرفه‌ای، با حوصله و توجه</span>
          </div>
        </div>

        <section className="ir-card" aria-labelledby="ir-signin-title">
          <div className="ir-card-header">
            <div className="ir-card-title">
              <h2 id="ir-signin-title">ورود مشاور</h2>
              <p>برای ادامه، مشخصات حساب خود را وارد کنید</p>
              <span className="ir-role"><i />VOICE_CONSULTANT</span>
            </div>
            <div className="ir-lock"><LockKeyhole size={21} /></div>
          </div>

          <div className="ir-dev-alert" role="note">
            <FlaskConical size={17} />
            <span>ورود فقط برای توسعه فعال است، نه ورود زنده. نشست آزمایشی با اعتبار فعلی سرور حداکثر ۲ ساعت اعتبار دارد.</span>
          </div>

          <form className="ir-form" onSubmit={handleSubmit} noValidate>
            <label className="ir-label" htmlFor="ir-phone">شماره موبایل حساب مشاور</label>
            <div className="ir-input-wrap">
              <Phone size={18} />
              <input
                id="ir-phone"
                className="ir-input"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                dir="ltr"
                placeholder="09xxxxxxxxx"
                value={phone}
                maxLength={20}
                onChange={(event) => { setPhone(normalizeDigits(event.target.value)); setPreviewNotice(''); }}
                aria-label="شماره موبایل حساب مشاور"
              />
            </div>

            <label className="ir-label" htmlFor="ir-code">کد توسعه‌ای ۶ رقمی</label>
            <div className="ir-input-wrap">
              <KeyRound size={18} />
              <input
                id="ir-code"
                className="ir-input ir-code"
                type="password"
                inputMode="numeric"
                autoComplete="one-time-code"
                dir="ltr"
                placeholder="••••••"
                value={code}
                maxLength={6}
                onChange={(event) => {
                  setCode(normalizeDigits(event.target.value).replace(/\D/g, '').slice(0, 6));
                  setPreviewNotice('');
                }}
                aria-label="کد توسعه‌ای شش رقمی"
              />
            </div>
            <div className="ir-security"><ShieldCheck size={15} /> در این پیش‌نمایش اطلاعات ارسال یا ذخیره نمی‌شوند.</div>
            <button className="ir-submit" type="submit">
              ورود امن به پنل <ArrowLeft size={17} />
            </button>
            {previewNotice ? <p className="ir-feedback" role="status">{previewNotice}</p> : null}
          </form>
          <div className="ir-card-foot">
            ورود آزمایشی فقط برای حساب فعال مشاور است. کد و توکن در گزارش‌ها ثبت نمی‌شوند.
          </div>
        </section>
      </section>

      <footer className="ir-footer">
        همراهِ مراقبت بهتر از حیوانات خانگی <Heart size={12} fill="currentColor" />
      </footer>
    </main>
  );
}

export default IvoryRubySignIn;
