## fetch і Response

`fetch` повертає Promise із відповіддю `Response`. HTTP-помилка сама по собі не відхиляє цей Promise. Перевір `response.ok`, а після успіху прочитай тіло через `await response.json()`.

```js
const response = await fetch("/mock/tasks.json");
if (!response.ok) throw new Error("Не вдалося завантажити задачі.");
const tasks = await response.json();
```

В Академії цей шлях читає локальний JSON із пакета вправи. У звичайному запуску він читається з локального сервера проєкту.
