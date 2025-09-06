// Атэелька Points Management System - Supabase Edition
class PointsSystem {
    constructor() {
        this.currentUser = null;
        this.users = [];
        this.editingUser = null;
        this.currentPage = 1;
        this.usersPerPage = 5; // Changed from 10 to 5 users per page
        this.filteredUsers = [];
        this.adminCurrentPage = 1;
        this.adminFilteredUsers = [];
        this.init();
    }

    async init() {
        try {
            await this.waitForSupabase();
            await this.testDatabaseConnection();
            await this.checkDefaultAdmin();
            await this.loadUsers();
            this.bindEvents();
            this.showLoginPage();
        } catch (error) {
            console.error('Initialization error:', error);
            alert('Ошибка инициализации приложения. Проверьте подключение к интернету и обновите страницу.');
        }
    }

    async testDatabaseConnection() {
        try {
            console.log('Testing database connection...');
            
            // Test connection to user table
            const { data: userData, error: userError } = await window.supabaseClient
                .from('user')
                .select('count')
                .limit(1);
            
            if (userError) {
                console.error('User table connection failed:', userError);
                throw new Error('Ошибка подключения к таблице пользователей');
            }
            
            // Test connection to orders table
            const { data: ordersData, error: ordersError } = await window.supabaseClient
                .from('orders')
                .select('count')
                .limit(1);
            
            if (ordersError) {
                console.warn('Orders table connection failed:', ordersError);
                if (ordersError.message.includes('relation "orders" does not exist')) {
                    console.log('Orders table does not exist - this will be handled during order creation');
                } else {
                    console.error('Orders table has other issues:', ordersError);
                }
            } else {
                console.log('Orders table connection successful');
            }
            
            console.log('Database connection test completed');
            
        } catch (error) {
            console.error('Database connection test failed:', error);
            throw error;
        }
    }

    async waitForSupabase() {
        return new Promise((resolve, reject) => {
            if (typeof window !== 'undefined' && window.supabase && window.supabaseClient) {
                resolve();
                return;
            }
            
            let attempts = 0;
            const maxAttempts = 50;
            
            const checkInterval = setInterval(() => {
                attempts++;
                
                if (typeof window !== 'undefined' && window.supabase) {
                    try {
                        if (!window.supabaseClient) {
                            window.supabaseClient = window.supabase.createClient(
                                'https://trpejzwjigmpixhgxreo.supabase.co',
                                'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRycGVqendqaWdtcGl4aGd4cmVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcxNzUxNDAsImV4cCI6MjA3Mjc1MTE0MH0.oRyb4ba-FPH12tJnmW22aPLsMmKE4CGTXCirW6dLSH4'
                            );
                        }
                        clearInterval(checkInterval);
                        resolve();
                    } catch (error) {
                        if (attempts >= maxAttempts) {
                            clearInterval(checkInterval);
                            reject(new Error('Failed to initialize Supabase client'));
                        }
                    }
                } else if (attempts >= maxAttempts) {
                    clearInterval(checkInterval);
                    reject(new Error('Supabase library failed to load'));
                }
            }, 100);
        });
    }

    async checkDefaultAdmin() {
        try {
            const admin = await this.getUserByUsername('admin');
            if (!admin) {
                await this.createUser({
                    username: 'admin',
                    password: '1234',
                    fio: 'Тороп Глеб',
                    role: 'superadmin',
                    points: 1,
                    created_at: new Date().toISOString()
                });
            }
        } catch (error) {
            console.error('Error checking default admin:', error);
            throw error;
        }
    }

    async loadUsers() {
        try {
            this.users = await this.getUsers();
            return this.users;
        } catch (error) {
            console.error('Error loading users:', error);
            this.showError('Ошибка загрузки пользователей');
            return [];
        }
    }

    async getUsers() {
        try {
            const { data, error } = await window.supabaseClient
                .from('user')
                .select('*');
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching users:', error);
            return [];
        }
    }

    async getUserByUsername(username) {
        try {
            const { data, error } = await window.supabaseClient
                .from('user')
                .select('*')
                .eq('username', username)
                .single();
            
            if (error && error.code !== 'PGRST116') throw error;
            return data;
        } catch (error) {
            console.error('Error fetching user:', error);
            return null;
        }
    }

    async createUser(userData) {
        try {
            const { data, error } = await window.supabaseClient
                .from('user')
                .insert([userData])
                .select()
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error creating user:', error);
            throw error;
        }
    }

    async updateUser(username, updates) {
        try {
            const { data, error } = await window.supabaseClient
                .from('user')
                .update(updates)
                .eq('username', username)
                .select()
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error updating user:', error);
            throw error;
        }
    }

    async deleteUser(username) {
        try {
            const { error } = await window.supabaseClient
                .from('user')
                .delete()
                .eq('username', username);
            
            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Error deleting user:', error);
            throw error;
        }
    }

    async createOrder(orderData) {
        try {
            console.log('Creating order with schema-matched structure:', orderData);
            
            // Use the exact schema from the Supabase orders table
            const orderRecord = {
                user_fio: orderData.user_fio || this.currentUser.fio || this.currentUser.username,
                username: orderData.username,
                product: orderData.product_name, // Maps to 'product' column
                cost: orderData.cost,
                status: 'pending',
                created_at: new Date().toISOString()
            };
            
            console.log('Inserting order record:', orderRecord);
            
            const { data, error } = await window.supabaseClient
                .from('orders')
                .insert([orderRecord])
                .select()
                .single();
            
            if (error) {
                console.error('Order creation failed:', error);
                throw error;
            }
            
            console.log('Order created successfully:', data);
            return data;
            
        } catch (error) {
            console.error('Error creating order:', error);
            throw error;
        }
    }

    async getOrders() {
        try {
            console.log('Loading orders from database...');
            const { data, error } = await window.supabaseClient
                .from('orders')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (error) {
                console.error('Error loading orders from database:', error);
                
                // If orders table doesn't exist, return empty array
                if (error.message.includes('relation "orders" does not exist') || error.code === '42P01') {
                    console.log('Orders table does not exist, returning empty array');
                    return [];
                }
                
                throw error;
            }
            
            console.log('Orders loaded from database:', data?.length || 0);
            return data || [];
            
        } catch (error) {
            console.error('Error fetching orders:', error);
            return [];
        }
    }

    async updateOrderStatus(orderId, status, completedBy = null) {
        try {
            console.log(`Updating order ${orderId} status to ${status}`);
            const updateData = { 
                status: status, 
                updated_at: new Date().toISOString() 
            };
            
            // Add completed_it field if provided
            if (completedBy) {
                updateData.completed_it = completedBy;
            }
            
            const { data, error } = await window.supabaseClient
                .from('orders')
                .update(updateData)
                .eq('id', orderId)
                .select()
                .single();
            
            if (error) {
                console.error('Error updating order status:', error);
                throw error;
            }
            
            console.log('Order status updated:', data);
            return data;
            
        } catch (error) {
            console.error('Error updating order status:', error);
            throw error;
        }
    }

    bindEvents() {
        document.getElementById('loginForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleLogin();
        });

        document.getElementById('logoutBtn').addEventListener('click', () => {
            this.handleLogout();
        });

        document.getElementById('updatePointsBtn').addEventListener('click', async () => {
            await this.handleUpdatePoints();
        });

        document.getElementById('createUserBtn').addEventListener('click', async () => {
            await this.handleCreateUser();
        });

        document.getElementById('exportReportBtn').addEventListener('click', async () => {
            await this.exportUsersReport();
        });
        
        document.getElementById('exportOrdersReportBtn').addEventListener('click', async () => {
            await this.exportOrdersReport();
        });
        
        document.getElementById('supervisorExportReportBtn').addEventListener('click', async () => {
            await this.exportUsersReport();
        });
        
        document.getElementById('supervisorExportOrdersReportBtn').addEventListener('click', async () => {
            await this.exportOrdersReport();
        });
        
        document.getElementById('supervisorCreateUserBtn').addEventListener('click', async () => {
            await this.handleSupervisorCreateUser();
        });

        document.getElementById('saveUserChangesBtn').addEventListener('click', async () => {
            await this.saveUserChanges();
        });
        
        document.getElementById('cancelEditBtn').addEventListener('click', () => {
            this.closeEditModal();
        });
        
        document.querySelector('.close').addEventListener('click', () => {
            this.closeEditModal();
        });
        
        window.addEventListener('click', (e) => {
            if (e.target === document.getElementById('editUserModal')) {
                this.closeEditModal();
            }
        });

        document.getElementById('userSearchInput').addEventListener('input', (e) => {
            this.filterUsers(e.target.value);
        });
        
        document.getElementById('adminSearchInput').addEventListener('input', (e) => {
            this.filterAdminUsers(e.target.value);
        });

        document.getElementById('prevPageBtn').addEventListener('click', () => {
            this.changePage(-1);
        });
        
        document.getElementById('nextPageBtn').addEventListener('click', () => {
            this.changePage(1);
        });

        // Refresh points button
        const refreshBtn = document.getElementById('refreshPointsBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', async () => {
                await this.refreshUserPoints();
            });
        }

        // Admin refresh button
        const adminRefreshBtn = document.getElementById('adminRefreshBtn');
        if (adminRefreshBtn) {
            adminRefreshBtn.addEventListener('click', async () => {
                await this.refreshUserPoints();
            });
        }

        // Super admin refresh button
        const superAdminRefreshBtn = document.getElementById('superAdminRefreshBtn');
        if (superAdminRefreshBtn) {
            superAdminRefreshBtn.addEventListener('click', async () => {
                await this.refreshUserPoints();
            });
        }


    }

    async handleLogin() {
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        const errorDiv = document.getElementById('loginError');

        if (!username || !password) {
            this.showError('Пожалуйста, заполните все поля', errorDiv);
            return;
        }

        try {
            const user = await this.getUserByUsername(username);
            if (!user || user.password !== password) {
                this.showError('Неверный логин или пароль', errorDiv);
                return;
            }

            this.currentUser = user;
            this.showDashboard();
        } catch (error) {
            console.error('Login error:', error);
            this.showError('Ошибка входа в систему', errorDiv);
        }
    }

    handleLogout() {
        this.currentUser = null;
        this.showLoginPage();
    }

    showError(message, element = null) {
        if (element) {
            element.textContent = message;
            element.style.display = 'block';
            setTimeout(() => {
                element.style.display = 'none';
            }, 5000);
        } else {
            this.showNotification('error', 'Ошибка', message);
        }
    }

    showSuccess(message) {
        this.showNotification('success', 'Успех', message);
    }
    
    showNotification(type = 'success', title = 'Уведомление', message = '') {
        const modal = document.getElementById('notificationModal');
        const header = modal.querySelector('.notification-header');
        const icon = document.getElementById('notificationIcon');
        const titleEl = document.getElementById('notificationTitle');
        const messageEl = document.getElementById('notificationMessage');
        
        header.classList.remove('success', 'error', 'warning');
        
        switch(type) {
            case 'success':
                header.classList.add('success');
                icon.textContent = '✓';
                break;
            case 'error':
                header.classList.add('error');
                icon.textContent = '⚠';
                break;
            case 'warning':
                header.classList.add('warning');
                icon.textContent = '⚠';
                break;
            default:
                icon.textContent = 'ℹ';
        }
        
        titleEl.textContent = title;
        messageEl.textContent = message;
        modal.style.display = 'block';
        
        // Longer display time for order fulfillment success messages
        if (type === 'success' && title.includes('Заказ выдан')) {
            setTimeout(() => {
                this.closeNotification();
            }, 5000); // 5 seconds for order fulfillment
        } else if (type === 'success') {
            setTimeout(() => {
                this.closeNotification();
            }, 3000); // 3 seconds for other success messages
        }
    }
    
    closeNotification() {
        document.getElementById('notificationModal').style.display = 'none';
    }

    showLoginPage() {
        document.getElementById('loginPage').classList.add('active');
        document.getElementById('dashboardPage').classList.remove('active');
        
        document.getElementById('username').value = '';
        document.getElementById('password').value = '';
        document.getElementById('loginError').style.display = 'none';
    }

    async showDashboard() {
        document.getElementById('loginPage').classList.remove('active');
        document.getElementById('dashboardPage').classList.add('active');
        
        await this.loadUsers();
        this.filteredUsers = [...this.users];
        this.adminFilteredUsers = [...this.users];
        
        this.updateUserInfo();
        this.updateDashboardVisibility();
        this.updateUsersList();
        this.updateAdminsList();
        
        if (this.currentUser.role === 'supervisor' || this.currentUser.role === 'superadmin') {
            await this.loadOrders();
        }
    }

    updateUserInfo() {
        const displayName = this.currentUser.fio || this.currentUser.username;
        document.getElementById('currentUser').textContent = displayName;
        document.getElementById('currentRole').textContent = this.getRoleDisplayName(this.currentUser.role);
        document.getElementById('userPoints').textContent = this.currentUser.points || 1;
    }

    getRoleDisplayName(role) {
        const roleNames = {
            'user': 'Пользователь',
            'supervisor': 'Супервизор',
            'superadmin': 'Супер Администратор'
        };
        return roleNames[role] || `${role} (Супервизор)`;
    }

    updateDashboardVisibility() {
        const userDashboard = document.getElementById('userDashboard');
        const adminDashboard = document.getElementById('adminDashboard');
        const superAdminDashboard = document.getElementById('superAdminDashboard');
        const shopSection = document.getElementById('shopSection');
        const supervisorControls = document.querySelector('.supervisor-controls');

        userDashboard.style.display = 'block';
        
        if (shopSection) {
            shopSection.style.display = this.currentUser.role === 'user' ? 'block' : 'none';
        }

        if (this.currentUser.role === 'supervisor' || this.currentUser.role === 'superadmin' || 
            (this.currentUser.role !== 'user' && this.currentUser.role !== 'superadmin')) {
            adminDashboard.style.display = 'block';
            
            if (supervisorControls) {
                supervisorControls.style.display = 'flex';
            }
        } else {
            adminDashboard.style.display = 'none';
        }

        if (this.currentUser.role === 'superadmin') {
            superAdminDashboard.style.display = 'block';
        } else {
            superAdminDashboard.style.display = 'none';
        }
    }

    generatePassword(inputId) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
        let password = '';
        for (let i = 0; i < 6; i++) {
            password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        document.getElementById(inputId).value = password;
    }

    generateRandomPassword() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let password = '';
        for (let i = 0; i < 6; i++) {
            password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return password;
    }

    filterUsers(searchTerm) {
        if (!searchTerm.trim()) {
            this.filteredUsers = [...this.users];
        } else {
            const term = searchTerm.toLowerCase();
            this.filteredUsers = this.users.filter(user => {
                const fio = user.fio || '';
                return (fio && fio.toLowerCase().includes(term)) ||
                       user.username.toLowerCase().includes(term);
            });
        }
        this.currentPage = 1;
        this.updateUsersList();
    }

    filterAdminUsers(searchTerm) {
        if (!searchTerm.trim()) {
            this.adminFilteredUsers = [...this.users];
        } else {
            const term = searchTerm.toLowerCase();
            this.adminFilteredUsers = this.users.filter(user => {
                const fio = user.fio || '';
                return (fio && fio.toLowerCase().includes(term)) ||
                       user.username.toLowerCase().includes(term);
            });
        }
        this.adminCurrentPage = 1;
        this.updateAdminsList();
    }

    changePage(direction) {
        const totalPages = Math.ceil(this.filteredUsers.length / this.usersPerPage);
        this.currentPage += direction;
        if (this.currentPage < 1) this.currentPage = 1;
        if (this.currentPage > totalPages) this.currentPage = totalPages;
        this.updateUsersList();
    }

    getPaginatedUsers(users, page, perPage) {
        const startIndex = (page - 1) * perPage;
        const endIndex = startIndex + perPage;
        return users.slice(startIndex, endIndex);
    }

    updatePaginationInfo() {
        const totalPages = Math.ceil(this.filteredUsers.length / this.usersPerPage);
        document.getElementById('pageInfo').textContent = `Страница ${this.currentPage} из ${totalPages}`;
        
        document.getElementById('prevPageBtn').disabled = this.currentPage <= 1;
        document.getElementById('nextPageBtn').disabled = this.currentPage >= totalPages;
    }

    updateUsersList() {
        const usersList = document.getElementById('usersList');
        const targetUserSelect = document.getElementById('targetUser');
        
        if (!usersList || !targetUserSelect) return;

        usersList.innerHTML = '';
        targetUserSelect.innerHTML = '<option value="">Выберите пользователя</option>';

        const paginatedUsers = this.getPaginatedUsers(this.filteredUsers, this.currentPage, this.usersPerPage);

        paginatedUsers.forEach(user => {
            if (user.username !== this.currentUser.username) {
                const option = document.createElement('option');
                option.value = user.username;
                const displayName = user.fio || user.username;
                option.textContent = `${displayName} (${this.getRoleDisplayName(user.role)})`;
                targetUserSelect.appendChild(option);
            }

            const userCard = this.createUserCard(user, false);
            usersList.appendChild(userCard);
        });

        this.updatePaginationInfo();
    }

    updateAdminsList() {
        const adminsList = document.getElementById('adminsList');
        if (!adminsList) return;

        adminsList.innerHTML = '';

        this.adminFilteredUsers.forEach(user => {
            const userCard = this.createUserCard(user, true);
            adminsList.appendChild(userCard);
        });
    }

    createUserCard(user, showAdminActions) {
        const card = document.createElement('div');
        card.className = 'user-card';

        const userInfo = document.createElement('div');
        userInfo.className = 'user-info-card';

        const userName = document.createElement('div');
        userName.className = 'user-name';
        userName.textContent = user.fio || user.username;

        const userLogin = document.createElement('div');
        userLogin.className = 'user-login';
        
        let showCredentials = false;
        if (this.currentUser.role === 'superadmin') {
            showCredentials = true;
        } else if ((this.currentUser.role === 'supervisor' || 
                   (this.currentUser.role !== 'user' && this.currentUser.role !== 'superadmin')) && 
                   user.role === 'user') {
            showCredentials = true;
        }
        
        if (showCredentials) {
            userLogin.textContent = `Логин: ${user.username}`;
        } else {
            userLogin.remove();
        }

        const userRole = document.createElement('div');
        userRole.className = `user-role role-${user.role}`;
        userRole.textContent = this.getRoleDisplayName(user.role);

        const userPoints = document.createElement('div');
        userPoints.className = 'user-points';
        userPoints.textContent = `${user.points || 1} Атэелька`;

        let showPassword = false;
        if (this.currentUser.role === 'superadmin') {
            showPassword = true;
        } else if ((this.currentUser.role === 'supervisor' || 
                   (this.currentUser.role !== 'user' && this.currentUser.role !== 'superadmin')) && 
                   user.role === 'user') {
            showPassword = true;
        }

        userInfo.appendChild(userName);
        if (showCredentials) {
            userInfo.appendChild(userLogin);
        }
        userInfo.appendChild(userRole);
        userInfo.appendChild(userPoints);
        
        if (showPassword) {
            const userPassword = document.createElement('div');
            userPassword.className = 'user-password';
            userPassword.textContent = `Пароль: ${user.password}`;
            userInfo.appendChild(userPassword);
        }

        const actions = document.createElement('div');
        actions.className = 'user-actions';

        if (showAdminActions && (this.currentUser.role === 'superadmin' || this.currentUser.role === 'supervisor')) {
            if (user.username !== this.currentUser.username) {
                let canEdit = false;
                if (this.currentUser.role === 'superadmin') {
                    canEdit = true;
                } else if (this.currentUser.role === 'supervisor' && user.role === 'user') {
                    canEdit = true;
                }

                if (canEdit) {
                    const editBtn = document.createElement('button');
                    editBtn.className = 'btn btn-edit';
                    editBtn.textContent = 'Редактировать';
                    editBtn.onclick = () => this.editUser(user.username);
                    actions.appendChild(editBtn);
                }

                let canDelete = false;
                if (this.currentUser.role === 'superadmin') {
                    canDelete = true;
                } else if (this.currentUser.role === 'supervisor' && user.role === 'user') {
                    canDelete = true;
                }

                if (canDelete) {
                    const deleteBtn = document.createElement('button');
                    deleteBtn.className = 'btn btn-danger';
                    deleteBtn.textContent = 'Удалить';
                    deleteBtn.onclick = () => this.deleteUserConfirmed(user.username);
                    actions.appendChild(deleteBtn);
                }
            }
        }

        card.appendChild(userInfo);
        card.appendChild(actions);

        return card;
    }

    async handleUpdatePoints() {
        const targetUsername = document.getElementById('targetUser').value;
        const action = document.getElementById('pointsAction').value;
        const amount = parseInt(document.getElementById('pointsAmount').value) || 1;

        if (!targetUsername) {
            this.showNotification('error', 'Ошибка', 'Пожалуйста, выберите пользователя');
            return;
        }

        if (amount < 1) {
            this.showNotification('error', 'Ошибка', 'Количество Атэельки не может быть меньше 1');
            return;
        }

        try {
            const targetUser = this.users.find(u => u.username === targetUsername);
            if (!targetUser) {
                this.showNotification('error', 'Ошибка', 'Пользователь не найден');
                return;
            }

            let newPoints = targetUser.points || 1;
            let actionText = '';

            switch (action) {
                case 'add':
                    newPoints += amount;
                    actionText = `+${amount}`;
                    break;
                case 'remove':
                    newPoints = Math.max(1, newPoints - amount);
                    actionText = `-${amount}`;
                    break;
                case 'set':
                    newPoints = Math.max(1, amount);
                    actionText = `установлено ${amount}`;
                    break;
            }

            await this.updateUser(targetUsername, { points: newPoints });
            
            await this.loadUsers();
            this.filteredUsers = [...this.users];
            this.adminFilteredUsers = [...this.users];
            
            if (targetUsername === this.currentUser.username) {
                this.currentUser.points = newPoints;
                this.updateUserInfo();
            }
            
            this.updateUsersList();
            this.updateAdminsList();
            
            const displayName = targetUser.fio || targetUsername;
            this.showNotification('success', 'Атэелька обновлена', `${displayName}: ${actionText} = ${newPoints} Атэелька`);

            document.getElementById('targetUser').value = '';
            document.getElementById('pointsAmount').value = '1';
        } catch (error) {
            console.error('Error updating points:', error);
            this.showNotification('error', 'Ошибка', 'Ошибка при обновлении Атэельки');
        }
    }

    async handleCreateUser() {
        const fio = document.getElementById('newUserFio').value.trim();
        const username = document.getElementById('newUsername').value.trim();
        const password = document.getElementById('newPassword').value;
        const role = document.getElementById('newUserRole').value;
        const points = Math.max(1, parseInt(document.getElementById('newUserPoints').value) || 1);

        if (!fio || !username || !password) {
            this.showNotification('error', 'Ошибка', 'Пожалуйста, заполните все обязательные поля');
            return;
        }
        
        if (this.currentUser.role === 'supervisor' || 
            (this.currentUser.role !== 'user' && this.currentUser.role !== 'superadmin')) {
            if (role !== 'user') {
                this.showNotification('error', 'Нет прав', 'Супервизор может создавать только пользователей. Обратитесь к суперадминистратору: https://t.me/Edward_Kallin');
                return;
            }
        }

        try {
            const existingUser = await this.getUserByUsername(username);
            if (existingUser) {
                this.showNotification('error', 'Ошибка', 'Пользователь с таким логином уже существует');
                return;
            }

            await this.createUser({
                username: username,
                password: password,
                fio: fio,
                role: role,
                points: points,
                created_at: new Date().toISOString()
            });

            await this.loadUsers();
            this.filteredUsers = [...this.users];
            this.adminFilteredUsers = [...this.users];
            this.updateUsersList();
            this.updateAdminsList();
            
            const roleDisplayName = this.getRoleDisplayName(role);
            this.showNotification('success', 'Пользователь создан', `${roleDisplayName} "${fio}" успешно создан`);

            document.getElementById('newUserFio').value = '';
            document.getElementById('newUsername').value = '';
            document.getElementById('newPassword').value = '';
            document.getElementById('newUserRole').value = 'user';
            document.getElementById('newUserPoints').value = '1';
        } catch (error) {
            console.error('Error creating user:', error);
            this.showNotification('error', 'Ошибка', 'Ошибка при создании пользователя');
        }
    }

    async deleteUserConfirmed(username) {
        if (username === this.currentUser.username) {
            this.showNotification('error', 'Ошибка', 'Нельзя удалить самого себя');
            return;
        }

        const user = this.users.find(u => u.username === username);
        if (!user) return;

        if (confirm(`Вы уверены, что хотите удалить ${user.fio || username}?`)) {
            try {
                await this.deleteUser(username);
                await this.loadUsers();
                this.filteredUsers = [...this.users];
                this.adminFilteredUsers = [...this.users];
                this.updateUsersList();
                this.updateAdminsList();
                this.showNotification('success', 'Пользователь удалён', 'Пользователь успешно удалён');
            } catch (error) {
                this.showNotification('error', 'Ошибка', 'Ошибка при удалении');
            }
        }
    }

    editUser(username) {
        const user = this.users.find(u => u.username === username);
        if (!user) return;

        this.editingUser = username;
        document.getElementById('editUserFio').value = user.fio || '';
        document.getElementById('editUsername').value = user.username;
        document.getElementById('editPassword').value = user.password;
        document.getElementById('editUserRole').value = user.role;
        document.getElementById('editUserPoints').value = user.points || 1;
        document.getElementById('editUserModal').style.display = 'block';
    }

    async saveUserChanges() {
        if (!this.editingUser) return;

        const fio = document.getElementById('editUserFio').value.trim();
        const password = document.getElementById('editPassword').value;
        const role = document.getElementById('editUserRole').value;
        const points = Math.max(1, parseInt(document.getElementById('editUserPoints').value) || 1);

        try {
            await this.updateUser(this.editingUser, {
                password: password,
                fio: fio,
                role: role,
                points: points
            });
            
            if (this.editingUser === this.currentUser.username) {
                this.currentUser = await this.getUserByUsername(this.editingUser);
                this.updateUserInfo();
            }

            await this.loadUsers();
            this.filteredUsers = [...this.users];
            this.adminFilteredUsers = [...this.users];
            this.updateUsersList();
            this.updateAdminsList();
            
            this.showNotification('success', 'Пользователь обновлён', 'Пользователь успешно обновлён');
            this.closeEditModal();
        } catch (error) {
            this.showNotification('error', 'Ошибка', 'Ошибка при обновлении');
        }
    }

    closeEditModal() {
        document.getElementById('editUserModal').style.display = 'none';
        this.editingUser = null;
    }

    async handleSupervisorCreateUser() {
        const fio = prompt('Введите ФИО:');
        if (!fio) return;
        
        const username = prompt('Введите логин:');
        if (!username) return;
        
        const password = prompt('Введите пароль:') || this.generateRandomPassword();
        
        try {
            await this.createUser({
                username, password, fio, role: 'user', points: 1,
                created_at: new Date().toISOString()
            });

            await this.loadUsers();
            this.filteredUsers = [...this.users];
            this.adminFilteredUsers = [...this.users];
            this.updateUsersList();
            this.updateAdminsList();
            
            this.showNotification('success', 'Пользователь создан', `Пользователь "${fio}" создан`);
        } catch (error) {
            this.showNotification('error', 'Ошибка', 'Ошибка при создании');
        }
    }

    async buyItem(itemName, cost) {
        if (this.currentUser.points < cost) {
            this.showNotification('error', 'Недостаточно Атээлька', `Нужно ${cost}, а у вас ${this.currentUser.points}`);
            return;
        }

        try {
            console.log('Starting order process for:', itemName, 'Cost:', cost);
            
            // Create order data with user FIO (stored as plain text per memory)
            const orderData = {
                user_fio: this.currentUser.fio || this.currentUser.username,
                username: this.currentUser.username,
                product_name: itemName, // Use product_name per memory
                cost: cost,
                status: 'pending',
                created_at: new Date().toISOString()
            };

            // Create the order in database
            console.log('Creating order in database...');
            await this.createOrder(orderData);
            
            console.log('Order created, now updating user points...');
            
            // Only deduct points if order creation succeeded
            const newPoints = this.currentUser.points - cost;
            await this.updateUser(this.currentUser.username, { points: newPoints });
            
            this.currentUser.points = newPoints;
            this.updateUserInfo();

            this.showNotification('success', 'Заказ оформлен', `Заказ на "${itemName}" успешно оформлен`);
            
            // Reload orders for supervisors/admins
            if (this.currentUser.role === 'supervisor' || this.currentUser.role === 'superadmin') {
                await this.loadOrders();
            }
        } catch (error) {
            console.error('Error in buyItem:', error);
            
            // Enhanced error messaging
            let errorTitle = 'Ошибка при заказе';
            let errorMessage = 'Не удалось оформить заказ';
            
            if (error.message.includes('relation "orders" does not exist') || error.code === '42P01') {
                errorTitle = 'Таблица заказов не существует';
                errorMessage = 'Таблица orders отсутствует в базе данных. Обратитесь к администратору системы.';
            } else if (error.message.includes('column')) {
                errorTitle = 'Ошибка структуры таблицы';
                errorMessage = `Проблема с колонками таблицы заказов: ${error.message}`;
            } else if (error.message.includes('network') || error.message.includes('connection')) {
                errorTitle = 'Ошибка соединения';
                errorMessage = 'Проблема с подключением к базе данных. Проверьте интернет-соединение.';
            } else if (error.message) {
                errorMessage = error.message;
            }
            
            this.showNotification('error', errorTitle, errorMessage);
        }
    }

    async loadOrders() {
        try {
            const orders = await this.getOrders();
            const ordersList = document.getElementById('ordersList');
            if (!ordersList) return;

            ordersList.innerHTML = '';
            const pendingOrders = orders.filter(order => order.status === 'pending');

            if (pendingOrders.length === 0) {
                ordersList.innerHTML = '<div class="empty-orders">Новых заказов нет</div>';
                return;
            }

            pendingOrders.forEach(order => {
                ordersList.appendChild(this.createOrderElement(order));
            });
        } catch (error) {
            console.error('Error loading orders:', error);
        }
    }

    createOrderElement(order) {
        const orderDiv = document.createElement('div');
        orderDiv.className = 'order-item';

        // Use the correct column names from the orders table schema
        const productName = order.product || 'Неизвестный товар';
        const userDisplayName = order.user_fio || order.username || 'Неизвестный пользователь';
        
        orderDiv.innerHTML = `
            <div class="order-info">
                <div class="order-user">${userDisplayName}</div>
                <div class="order-product">${productName} (${order.cost} Атээлька)</div>
                <div class="order-time">${new Date(order.created_at).toLocaleString('ru-RU')}</div>
            </div>
            <div class="order-actions">
                <button class="btn btn-fulfill" onclick="pointsSystem.fulfillOrder('${order.id}')">Выдать</button>
            </div>
        `;

        return orderDiv;
    }

    async fulfillOrder(orderId) {
        try {
            console.log('Fulfilling order with ID:', orderId);
            
            // Find the order to get user details for the notification
            const orders = await this.getOrders();
            const order = orders.find(o => o.id === orderId);
            
            if (!order) {
                this.showNotification('error', 'Ошибка', 'Заказ не найден');
                return;
            }
            
            // Get administrator's FIO who is completing the order
            const adminFio = this.currentUser.fio || this.currentUser.username;
            
            // Update order status to fulfilled with administrator's FIO
            await this.updateOrderStatus(orderId, 'fulfilled', adminFio);
            
            // Reload orders list to remove fulfilled order
            await this.loadOrders();
            
            // Show success notification with order details
            const userName = order.user_fio || order.username || 'Пользователь';
            const productName = order.product || 'Товар';
            
            this.showNotification(
                'success', 
                'Заказ выдан! 🎉', 
                `Заказ "${productName}" для пользователя ${userName} успешно выдан`
            );
            
        } catch (error) {
            console.error('Error fulfilling order:', error);
            
            let errorMessage = 'Ошибка при выдаче заказа';
            
            if (error.message.includes('permission') || error.message.includes('policy')) {
                errorMessage = 'Нет прав на обновление статуса заказа';
            } else if (error.message.includes('network') || error.message.includes('connection')) {
                errorMessage = 'Проблема с подключением к базе данных';
            } else if (error.message) {
                errorMessage = error.message;
            }
            
            this.showNotification('error', 'Ошибка выдачи', errorMessage);
        }
    }

    async exportUsersReport() {
        try {
            let usersToExport = [...this.users];
            if (this.currentUser.role === 'supervisor') {
                usersToExport = this.users.filter(user => user.role === 'user');
            }
            
            if (usersToExport.length === 0) {
                this.showNotification('warning', 'Нет данных', 'Нет пользователей');
                return;
            }

            const workbook = XLSX.utils.book_new();
            const exportData = usersToExport.map(user => ({
                'ФИО': user.fio || '',
                'Логин': user.username,
                'Пароль': user.password,
                'Роль': this.getRoleDisplayName(user.role),
                'Атээлька': user.points || 1
            }));

            const worksheet = XLSX.utils.json_to_sheet(exportData);
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Пользователи');

            const fileName = `Пользователи_${new Date().toLocaleDateString('ru-RU').replace(/\./g, '-')}.xlsx`;
            XLSX.writeFile(workbook, fileName);
            
            this.showNotification('success', 'Отчёт создан', `Отчёт "${fileName}" выгружен`);
        } catch (error) {
            this.showNotification('error', 'Ошибка', 'Ошибка экспорта');
        }
    }

    async exportOrdersReport() {
        try {
            const orders = await this.getOrders();
            
            if (orders.length === 0) {
                this.showNotification('warning', 'Нет данных', 'Нет заказов для выгрузки. Сначала нужно создать заказы.');
                return;
            }

            const workbook = XLSX.utils.book_new();
            const exportData = orders.map(order => ({
                'Пользователь': order.user_fio || order.username,
                'Логин': order.username,
                'Товар': order.product || 'Неизвестный товар',
                'Стоимость': order.cost + ' Атээлька',
                'Статус': order.status === 'pending' ? 'Ожидает' : 'Выполнен',
                'Выдал заказ': order.completed_it || (order.status === 'fulfilled' ? 'Не указан' : ''),
                'Дата заказа': new Date(order.created_at).toLocaleString('ru-RU'),
                'Дата обновления': order.updated_at ? new Date(order.updated_at).toLocaleString('ru-RU') : 'Не обновлялся'
            }));

            const worksheet = XLSX.utils.json_to_sheet(exportData);
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Заказы');

            const fileName = `Заказы_${new Date().toLocaleDateString('ru-RU').replace(/\./g, '-')}.xlsx`;
            XLSX.writeFile(workbook, fileName);
            
            this.showNotification('success', 'Отчёт создан', `Отчёт "${fileName}" выгружен`);
        } catch (error) {
            console.error('Error exporting orders report:', error);
            this.showNotification('error', 'Ошибка экспорта', 'Ошибка при создании отчёта по заказам');
        }
    }

    // Refresh user points
    async refreshUserPoints() {
        try {
            const updatedUser = await this.getUserByUsername(this.currentUser.username);
            if (updatedUser) {
                this.currentUser = updatedUser;
                this.updateUserInfo();
                this.showNotification('success', 'Обновлено', 'Атээлька обновлена');
            }
        } catch (error) {
            console.error('Error refreshing points:', error);
            this.showNotification('error', 'Ошибка', 'Ошибка обновления данных');
        }
    }


}

// Initialize the application
const pointsSystem = new PointsSystem();
