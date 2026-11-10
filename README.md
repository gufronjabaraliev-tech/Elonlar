# E'lonlar

Uy, mashina va boshqa e'lonlar. Ilova Telegram Mini App va oddiy veb sahifa sifatida ishlaydi.

## Kirish

- Foydalanuvchi Telegram Mini App ichida kiradi. Server `initData` ni bot tokeni bilan tekshiradi.
- Admin Mini App orqali kirsa, `ADMIN_TELEGRAM_ID` bo'yicha taniydi.
- Veb admin `/admin` sahifasiga login va parol bilan kiradi.
- Brauzerda Telegram sessiyasisiz e'lonlarni ko'rish mumkin. Joylash uchun Mini App kerak.

## Ishga tushirish

```sh
npm install
cp .env.example .env
npm run dev
```

`.env` dagi Supabase, Telegram bot tokeni va admin ma'lumotlarini o'z qiymatlaringiz bilan to'ldiring.
