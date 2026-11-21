## Читання властивостей

Крапка підходить, коли ім’я властивості відоме під час написання коду. Квадратні дужки дозволяють прочитати властивість за рядком або за значенням змінної.

```js
const reminder = { title: "Полити квіти", minutes: 0 };
const field = "title";

console.log(reminder.title); // Полити квіти
console.log(reminder["title"]); // Полити квіти
console.log(reminder[field]); // Полити квіти
console.log(reminder.field); // undefined
```

`reminder.field` шукає властивість з іменем `field`. `reminder[field]` використовує значення змінної `field`.

## Зміна властивості

Щоб записати нове значення в наявну властивість, постав її ліворуч від `=`. Дозволено змінювати властивості об’єкта, оголошеного через `const`. Сама змінна продовжує посилатися на той самий об’єкт.

```js
const reminder = { status: "Заплановано" };
reminder.status = "Готово";

console.log(reminder.status); // Готово
```

Якщо записати `const draft = reminder`, обидві змінні вказуватимуть на той самий об’єкт. Запис у `draft.status` тоді змінить і те, що читаємо через `reminder.status`. Щоб обрати окрему чернетку для редагування, створи новий літерал і заповни його потрібними значеннями.

## Перевірка наявності поля

`Object.hasOwn(object, field)` — готовий метод JavaScript. Він повертає `true`, якщо об’єкт має власне поле з таким іменем, і `false`, якщо поля немає або воно успадковане. Для звичайного об’єкта властивість `toString` зазвичай доступна через успадкування. У літералі нижче власні поля — `minutes` і `completed`.

```js
const reminder = { minutes: 0, completed: false };

console.log(Object.hasOwn(reminder, "minutes")); // true
console.log(Object.hasOwn(reminder, "completed")); // true
console.log(Object.hasOwn(reminder, "status")); // false
console.log(Object.hasOwn(reminder, "toString")); // false
```

Умова `if (reminder.minutes)` оцінює значення. Для нуля вона не спрацьовує, хоча поле існує. Що поверне `Object.hasOwn` для власного поля зі значенням `""`?
