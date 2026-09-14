// Аутентификация и управление сессией

// Загрузка базы данных
async function loadDatabase() {
    try {
        const response = await fetch('data/database.json');
        return await response.json();
    } catch (error) {
        console.error('Ошибка загрузки базы данных:', error);
        return null;
    }
}

// Проверка авторизации
function checkAuth() {
    const currentUser = localStorage.getItem('currentUser');
    if (!currentUser && !window.location.pathname.endsWith('index.html') && !window.location.pathname.endsWith('/')) {
        window.location.href = 'index.html';
        return null;
    }
    return currentUser ? JSON.parse(currentUser) : null;
}

// Выход из системы
function logout() {
    localStorage.removeItem('currentUser');
    window.location.href = 'index.html';
}

// Форма авторизации
if (document.getElementById('loginForm')) {
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const errorMessage = document.getElementById('error-message');
        
        const database = await loadDatabase();
        
        if (!database) {
            errorMessage.textContent = 'Ошибка подключения к базе данных';
            errorMessage.style.display = 'block';
            return;
        }
        
        const user = database.users.find(u => u.username === username && u.password === password);
        
        if (user) {
            // Сохраняем пользователя без пароля
            const userSession = {
                id: user.id,
                username: user.username,
                name: user.name,
                role: user.role,
                permissions: user.permissions
            };
            
            localStorage.setItem('currentUser', JSON.stringify(userSession));
            
            // Перенаправляем в зависимости от роли
            if (user.role === 'vs' || user.role === 'admin') {
                window.location.href = 'dashboard.html';
            } else {
                window.location.href = 'analytics.html';
            }
        } else {
            errorMessage.textContent = 'Неверный логин или пароль';
            errorMessage.style.display = 'block';
        }
    });
}

// Экспорт функций
window.authModule = {
    checkAuth,
    logout,
    loadDatabase
};
