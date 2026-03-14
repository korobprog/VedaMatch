# 📋 Вкладка "Запросы в друзья" — Инструкция

## 🎯 Что сделано

Добавлена четвёртая вкладка **"Запросы"** рядом с "Все", "Друзья", "Заблокированы" в экране контактов.

---

## 📊 Как выглядит

```
┌─────────────────────────────────────────┐
│  [Все (50)] [Запросы 🔴3] [Друзья] [🔒] │
├─────────────────────────────────────────┤
│                                         │
│  При нажатии на "Запросы":              │
│  - Показывается список входящих запросов │
│  - Красный бейдж с количеством          │
│                                         │
└─────────────────────────────────────────┘
```

---

## 🔧 Изменения

**Файл:** `frontend/screens/portal/contacts/ContactsScreen.tsx`

1. **Новый тип фильтра:**
   ```typescript
   const [filter, setFilter] = useState<'all' | 'requests' | 'friends' | 'blocked'>('all');
   ```

2. **Состояние для запросов:**
   ```typescript
   const [requests, setRequests] = useState<any[]>([]);
   const [friendRequestCount, setFriendRequestCount] = useState(0);
   ```

3. **Загрузка запросов:**
   ```typescript
   useEffect(() => {
       const reqs = await friendRequestService.getIncomingRequests();
       setRequests(reqs);
       setFriendRequestCount(reqs.length);
   }, []);
   ```

4. **Вкладка в filterBar:**
   ```tsx
   <TouchableOpacity onPress={() => setFilter('requests')}>
       <Text>Запросы</Text>
       {friendRequestCount > 0 && (
           <View style={styles.countBadge}>
               <Text>{friendRequestCount}</Text>
           </View>
       )}
   </TouchableOpacity>
   ```

5. **Отображение запросов:**
   ```typescript
   if (filter === 'requests') {
       return requests.map(req => ({
           ID: req.senderId,
           karmicName: req.senderName,
           avatarUrl: req.avatarUrl,
           city: req.city,
           country: req.country,
       }));
   }
   ```

---

## 🎨 Стили

**Бейдж:**
```typescript
countBadge: {
    position: 'absolute',
    top: -4,
    right: -8,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#F44336',  // Красный
}
```

---

## ⏳ Что осталось сделать

1. **Добавить кнопки "Принять/Отклонить"** в `renderItem` для фильтра `requests`
2. **Обновить `displayedContacts`** чтобы правильно обрабатывать запросы
3. **Добавить обработку кнопок** accept/reject

---

## 🧪 Тестирование

1. Открыть приложение
2. Перейти в Контакты
3. Нажать на вкладку **"Запросы"**
4. ✅ Должен показаться список входящих запросов
5. ✅ Красный бейдж с количеством

---

## 📝 Коммит

- `xxxxxxx` — feat: добавлена вкладка 'Запросы' в контакты с бейджем

---

*Документ создан: 14 марта 2026, 20:00 MSK*  
*Статус: ✅ Вкладка добавлена, ⏳ кнопки accept/reject в процессе*
