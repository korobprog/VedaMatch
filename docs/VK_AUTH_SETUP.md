# VK Auth Setup (VedaMatch)

## 1) Создать приложение в VK ID
1. Откройте VK ID Console и создайте приложение.
2. Тип приложения: для мобильного входа (OAuth 2.0).
3. Заполните базовые поля приложения (название, контакты, политика конфиденциальности).

## 2) Redirect URI
Для VK ID Console используйте HTTPS callback:

`https://api.vedamatch.ru/auth/vk/callback`

Deep link `vedamatch://...` в поле VK redirect URI добавлять не нужно — VK принимает только `https`.

## 3) Получить client credentials
В VK ID Console сохраните:
- `VK_CLIENT_ID` (идентификатор приложения)
- `VK_CLIENT_SECRET` (секрет приложения)

## 4) Заполнить env
Frontend (`frontend/.env*`):

```env
VK_CLIENT_ID=<vk_client_id>
VK_REDIRECT_URI=https://api.vedamatch.ru/auth/vk/callback
VK_SCOPE=email
```

Backend (`server/.env`):

```env
AUTH_VK_ENABLED=on
VK_CLIENT_ID=<vk_client_id>
VK_CLIENT_SECRET=<vk_client_secret>
VK_REDIRECT_URI=https://api.vedamatch.ru/auth/vk/callback
```

## 5) Текущий статус в проекте
- Login UI уже содержит кнопку VK.
- На текущем этапе она работает как prepared entry point (coming soon + telemetry).
- Для полного запуска нужен backend flow (`/api/auth/vk/login` + token exchange + account linking).
