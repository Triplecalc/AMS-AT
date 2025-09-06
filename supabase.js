// Supabase configuration and API client
const SUPABASE_URL = 'https://trpejzwjigmpixhgxreo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRycGVqendqaWdtcGl4aGd4cmVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcxNzUxNDAsImV4cCI6MjA3Mjc1MTE0MH0.oRyb4ba-FPH12tJnmW22aPLsMmKE4CGTXCirW6dLSH4';

// Initialize Supabase client (will be set when ready)
let supabaseClient = null;

// Function to initialize Supabase client
function initializeSupabase() {
    try {
        if (typeof window !== 'undefined' && window.supabase) {
            supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            console.log('Supabase client initialized successfully');
            return true;
        } else {
            console.error('Supabase library not loaded!');
            return false;
        }
    } catch (error) {
        console.error('Failed to initialize Supabase client:', error);
        return false;
    }
}

// Wait for Supabase to be available
function waitForSupabase() {
    return new Promise((resolve, reject) => {
        if (initializeSupabase()) {
            resolve();
            return;
        }
        
        let attempts = 0;
        const maxAttempts = 50; // 5 seconds
        
        const checkInterval = setInterval(() => {
            attempts++;
            
            if (initializeSupabase()) {
                clearInterval(checkInterval);
                resolve();
            } else if (attempts >= maxAttempts) {
                clearInterval(checkInterval);
                reject(new Error('Supabase library failed to load after 5 seconds'));
            }
        }, 100);
    });
}

// Database operations for users
class UserDatabase {
    // Check if Supabase client is ready
    static checkClient() {
        if (!supabaseClient) {
            throw new Error('Supabase client not initialized');
        }
    }

    // Get all users
    static async getUsers() {
        try {
            this.checkClient();
            const { data, error } = await supabaseClient
                .from('user')
                .select('*');
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching users:', error);
            return [];
        }
    }

    // Get user by username
    static async getUserByUsername(username) {
        try {
            this.checkClient();
            const { data, error } = await supabaseClient
                .from('user')
                .select('*')
                .eq('username', username)
                .single();
            
            if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned
            return data;
        } catch (error) {
            console.error('Error fetching user:', error);
            return null;
        }
    }

    // Create new user
    static async createUser(userData) {
        try {
            this.checkClient();
            const { data, error } = await supabaseClient
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

    // Update user
    static async updateUser(username, updates) {
        try {
            this.checkClient();
            const { data, error } = await supabaseClient
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

    // Delete user
    static async deleteUser(username) {
        try {
            this.checkClient();
            const { error } = await supabaseClient
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

    // Create multiple users (bulk insert)
    static async createUsers(usersData) {
        try {
            const { data, error } = await supabaseClient
                .from('user')
                .insert(usersData)
                .select();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error creating users:', error);
            throw error;
        }
    }

    // Check if user exists by FIO
    static async userExistsByFio(fio) {
        try {
            const { data, error } = await supabaseClient
                .from('user')
                .select('username')
                .eq('fio', fio)
                .single();
            
            if (error && error.code !== 'PGRST116') throw error;
            return !!data;
        } catch (error) {
            console.error('Error checking user existence:', error);
            return false;
        }
    }
}

// Database operations for orders
class OrderDatabase {
    // Check if Supabase client is ready
    static checkClient() {
        if (!supabaseClient) {
            throw new Error('Supabase client not initialized');
        }
    }

    // Create new order
    static async createOrder(orderData) {
        try {
            this.checkClient();
            const { data, error } = await supabaseClient
                .from('orders')
                .insert([orderData])
                .select()
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error creating order:', error);
            throw error;
        }
    }

    // Get all orders
    static async getOrders() {
        try {
            const { data, error } = await supabaseClient
                .from('orders')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching orders:', error);
            return [];
        }
    }

    // Update order status
    static async updateOrderStatus(orderId, status) {
        try {
            const { data, error } = await supabaseClient
                .from('orders')
                .update({ status: status, updated_at: new Date().toISOString() })
                .eq('id', orderId)
                .select()
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error updating order status:', error);
            throw error;
        }
    }