// 数据持久化存储工具类
class PersistentStorage {
    constructor() {
        this.dbName = 'WangpuCommunityDB';
        this.dbVersion = 1;
        this.db = null;
        this.initialized = false;
        this.initDatabase();
    }

    // 初始化数据库
    initDatabase() {
        return new Promise((resolve, reject) => {
            // 检查浏览器是否支持IndexedDB
            if (!('indexedDB' in window)) {
                console.warn('浏览器不支持IndexedDB，将使用localStorage作为后备方案');
                this.initialized = true;
                resolve();
                return;
            }

            const request = indexedDB.open(this.dbName, 2); // 增加版本号以支持升级

            request.onerror = (event) => {
                console.error('数据库打开失败:', event.target.error);
                this.initialized = true; // 即使失败也标记为已初始化，使用后备方案
                resolve();
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                this.initialized = true;
                console.log('数据库连接成功');
                resolve();
            };

            request.onupgradeneeded = (event) => {
                this.db = event.target.result;
                
                // 创建用户表
                if (!this.db.objectStoreNames.contains('users')) {
                    const userStore = this.db.createObjectStore('users', { keyPath: 'id' });
                    // 创建索引以便于查询用户
                    userStore.createIndex('by_username', 'username', { unique: true });
                }
                
                // 创建对话表
                if (!this.db.objectStoreNames.contains('conversations')) {
                    this.db.createObjectStore('conversations', { keyPath: 'id' });
                }
                
                // 创建帖子表
                if (!this.db.objectStoreNames.contains('posts')) {
                    this.db.createObjectStore('posts', { keyPath: 'id' });
                }
                
                // 创建公告表
                if (!this.db.objectStoreNames.contains('announcements')) {
                    this.db.createObjectStore('announcements', { keyPath: 'id' });
                }
                
                // 创建消息表
                if (!this.db.objectStoreNames.contains('messages')) {
                    const messageStore = this.db.createObjectStore('messages', { keyPath: 'id' });
                    // 创建索引以便于查询特定对话的消息
                    messageStore.createIndex('by_conversationId', 'conversationId', { unique: false });
                }
                
                console.log('数据库升级完成');
            };
        });
    }

    // 等待数据库初始化完成
    async waitForInit() {
        while (!this.initialized) {
            await new Promise(resolve => setTimeout(resolve, 10));
        }
    }

    // 保存数据
    async saveData(storeName, data) {
        await this.waitForInit();
        
        // 如果数据库不可用，使用localStorage作为后备
        if (!this.db) {
            return this.saveToLocalStorage(storeName, data);
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.put(data);

            request.onsuccess = () => {
                console.log(`数据保存成功: ${storeName}`, data);
                resolve(request.result);
            };

            request.onerror = (event) => {
                console.error(`数据保存失败: ${storeName}`, event.target.error);
                // 失败时使用localStorage作为后备
                this.saveToLocalStorage(storeName, data);
                resolve(null);
            };
        });
    }

    // 批量保存数据
    async saveAllData(storeName, dataArray) {
        await this.waitForInit();
        
        if (!this.db) {
            return this.saveAllToLocalStorage(storeName, dataArray);
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            
            dataArray.forEach(data => {
                store.put(data);
            });

            transaction.oncomplete = () => {
                console.log(`批量数据保存成功: ${storeName}`, dataArray.length);
                resolve(true);
            };

            transaction.onerror = (event) => {
                console.error(`批量数据保存失败: ${storeName}`, event.target.error);
                // 失败时使用localStorage作为后备
                this.saveAllToLocalStorage(storeName, dataArray);
                resolve(false);
            };
        });
    }

    // 获取所有数据
    async getAllData(storeName) {
        await this.waitForInit();
        
        if (!this.db) {
            return this.getAllFromLocalStorage(storeName);
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();

            request.onsuccess = () => {
                console.log(`获取数据成功: ${storeName}`, request.result.length);
                resolve(request.result);
            };

            request.onerror = (event) => {
                console.error(`获取数据失败: ${storeName}`, event.target.error);
                // 失败时从localStorage获取
                resolve(this.getAllFromLocalStorage(storeName));
            };
        });
    }

    // 根据ID获取数据
    async getDataById(storeName, id) {
        await this.waitForInit();
        
        if (!this.db) {
            return this.getDataFromLocalStorageById(storeName, id);
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(id);

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = (event) => {
                console.error(`获取数据失败: ${storeName} ID: ${id}`, event.target.error);
                // 失败时从localStorage获取
                resolve(this.getDataFromLocalStorageById(storeName, id));
            };
        });
    }

    // 删除数据
    async deleteData(storeName, id) {
        await this.waitForInit();
        
        if (!this.db) {
            return this.deleteFromLocalStorage(storeName, id);
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(id);

            request.onsuccess = () => {
                console.log(`数据删除成功: ${storeName} ID: ${id}`);
                resolve(true);
            };

            request.onerror = (event) => {
                console.error(`数据删除失败: ${storeName} ID: ${id}`, event.target.error);
                // 失败时从localStorage删除
                this.deleteFromLocalStorage(storeName, id);
                resolve(false);
            };
        });
    }

    // 将聊天数据导出为JSON文件
    exportChatData() {
        const conversations = JSON.parse(localStorage.getItem('wangpu_conversations') || '[]');
        const users = JSON.parse(localStorage.getItem('wangpu_users') || '[]');
        
        const exportData = {
            conversations,
            users,
            exportTime: new Date().toISOString(),
            version: '1.0'
        };
        
        const dataStr = JSON.stringify(exportData, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        
        const exportFileName = `wangpu_chat_export_${new Date().toISOString().split('T')[0]}.json`;
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileName);
        linkElement.click();
        
        console.log('聊天数据导出成功');
        return exportFileName;
    }

    // 导入聊天数据
    importChatData(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const importData = JSON.parse(e.target.result);
                    
                    // 验证导入数据格式
                    if (importData.conversations && Array.isArray(importData.conversations)) {
                        localStorage.setItem('wangpu_conversations', JSON.stringify(importData.conversations));
                        
                        // 如果包含用户数据，也导入
                        if (importData.users && Array.isArray(importData.users)) {
                            const existingUsers = JSON.parse(localStorage.getItem('wangpu_users') || '[]');
                            // 合并用户数据，保留现有数据优先
                            const mergedUsers = this.mergeUsers(existingUsers, importData.users);
                            localStorage.setItem('wangpu_users', JSON.stringify(mergedUsers));
                        }
                        
                        console.log('聊天数据导入成功', importData.conversations.length);
                        resolve({ success: true, conversations: importData.conversations.length });
                    } else {
                        reject(new Error('无效的数据格式'));
                    }
                } catch (error) {
                    console.error('数据导入失败', error);
                    reject(error);
                }
            };
            
            reader.onerror = () => {
                reject(new Error('文件读取失败'));
            };
            
            reader.readAsText(file);
        });
    }
    
    // 根据用户名获取用户
    async getUserByUsername(username) {
        await this.waitForInit();
        
        if (!this.db) {
            const users = JSON.parse(localStorage.getItem('wangpu_users') || '[]');
            return users.find(user => user.username === username);
        }
        
        return new Promise((resolve, reject) => {
            try {
                const transaction = this.db.transaction(['users'], 'readonly');
                const store = transaction.objectStore('users');
                const index = store.index('by_username');
                const request = index.get(username);
                
                request.onsuccess = () => {
                    resolve(request.result || null);
                };
                
                request.onerror = (event) => {
                    console.error('获取用户失败:', event.target.error);
                    resolve(null);
                };
            } catch (error) {
                console.error('获取用户失败:', error);
                resolve(null);
            }
        });
    }

    // 合并用户数据
    mergeUsers(existingUsers, importedUsers) {
        const userMap = new Map();
        
        // 先添加现有用户
        existingUsers.forEach(user => {
            userMap.set(user.id, user);
        });
        
        // 仅添加不存在的导入用户
        importedUsers.forEach(user => {
            if (!userMap.has(user.id)) {
                userMap.set(user.id, user);
            }
        });
        
        return Array.from(userMap.values());
    }

    // localStorage 后备方法
    saveToLocalStorage(storeName, data) {
        try {
            const key = `wangpu_${storeName}`;
            const existingData = JSON.parse(localStorage.getItem(key) || '[]');
            const index = existingData.findIndex(item => item.id === data.id);
            
            if (index !== -1) {
                existingData[index] = data;
            } else {
                existingData.push(data);
            }
            
            localStorage.setItem(key, JSON.stringify(existingData));
            return data.id;
        } catch (error) {
            console.error('localStorage保存失败', error);
            return null;
        }
    }

    saveAllToLocalStorage(storeName, dataArray) {
        try {
            const key = `wangpu_${storeName}`;
            localStorage.setItem(key, JSON.stringify(dataArray));
            return true;
        } catch (error) {
            console.error('localStorage批量保存失败', error);
            return false;
        }
    }

    getAllFromLocalStorage(storeName) {
        try {
            const key = `wangpu_${storeName}`;
            return JSON.parse(localStorage.getItem(key) || '[]');
        } catch (error) {
            console.error('localStorage获取失败', error);
            return [];
        }
    }

    getDataFromLocalStorageById(storeName, id) {
        try {
            const key = `wangpu_${storeName}`;
            const dataArray = JSON.parse(localStorage.getItem(key) || '[]');
            return dataArray.find(item => item.id === id) || null;
        } catch (error) {
            console.error('localStorage获取失败', error);
            return null;
        }
    }

    deleteFromLocalStorage(storeName, id) {
        try {
            const key = `wangpu_${storeName}`;
            const dataArray = JSON.parse(localStorage.getItem(key) || '[]');
            const filteredData = dataArray.filter(item => item.id !== id);
            localStorage.setItem(key, JSON.stringify(filteredData));
            return true;
        } catch (error) {
            console.error('localStorage删除失败', error);
            return false;
        }
    }

    // 同步localStorage数据到IndexedDB
    async syncLocalStorageToDB() {
        await this.waitForInit();
        
        if (!this.db) {
            console.log('数据库不可用，跳过同步');
            return;
        }

        try {
            // 同步用户数据
            const users = JSON.parse(localStorage.getItem('wangpu_users') || '[]');
            if (users.length > 0) {
                await this.saveAllData('users', users);
            }

            // 同步对话数据
            const conversations = JSON.parse(localStorage.getItem('wangpu_conversations') || '[]');
            for (const conversation of conversations) {
                await this.saveData('conversations', conversation);
                
                // 单独保存消息
                if (conversation.messages && conversation.messages.length > 0) {
                    for (const message of conversation.messages) {
                        await this.saveData('messages', {
                            id: message.id,
                            conversationId: conversation.id,
                            ...message
                        });
                    }
                }
            }

            // 同步帖子数据
            const posts = JSON.parse(localStorage.getItem('wangpu_posts') || '[]');
            if (posts.length > 0) {
                await this.saveAllData('posts', posts);
            }

            // 同步公告数据
            const announcements = JSON.parse(localStorage.getItem('wangpu_announcements') || '[]');
            if (announcements.length > 0) {
                await this.saveAllData('announcements', announcements);
            }

            console.log('localStorage数据已同步到IndexedDB');
        } catch (error) {
            console.error('数据同步失败', error);
        }
    }

    // 从IndexedDB加载数据到localStorage
    async loadDBToLocalStorage() {
        await this.waitForInit();
        
        if (!this.db) {
            console.log('数据库不可用，跳过加载');
            return;
        }

        try {
            // 加载用户数据
            const users = await this.getAllData('users');
            if (users && users.length > 0) {
                localStorage.setItem('wangpu_users', JSON.stringify(users));
            }

            // 加载对话数据
            const conversations = await this.getAllData('conversations');
            if (conversations && conversations.length > 0) {
                localStorage.setItem('wangpu_conversations', JSON.stringify(conversations));
            }

            // 加载帖子数据
            const posts = await this.getAllData('posts');
            if (posts.length > 0) {
                localStorage.setItem('wangpu_posts', JSON.stringify(posts));
            }

            // 加载公告数据
            const announcements = await this.getAllData('announcements');
            if (announcements.length > 0) {
                localStorage.setItem('wangpu_announcements', JSON.stringify(announcements));
            }
            
            // 加载消息数据并合并到对话中
            const messages = await this.getAllData('messages');
            if (messages && messages.length > 0) {
                const currentConversations = JSON.parse(localStorage.getItem('wangpu_conversations') || '[]');
                messages.forEach(msg => {
                    const conversation = currentConversations.find(c => c.id === msg.conversationId);
                    if (conversation) {
                        if (!conversation.messages) conversation.messages = [];
                        conversation.messages.push(msg);
                    }
                });
                localStorage.setItem('wangpu_conversations', JSON.stringify(currentConversations));
            }

            console.log('数据已从IndexedDB同步到localStorage');
        } catch (error) {
            console.error('数据加载失败', error);
        }
    }
}

// 导出实例
const persistentStorage = new PersistentStorage();

// 页面加载时从数据库加载数据到localStorage
window.addEventListener('DOMContentLoaded', async () => {
    await persistentStorage.loadDBToLocalStorage();
});

// 页面关闭前同步数据到数据库
window.addEventListener('beforeunload', async () => {
    await persistentStorage.syncLocalStorageToDB();
});

// 定期自动同步数据（每60秒）
setInterval(async () => {
    await persistentStorage.syncLocalStorageToDB();
}, 60000);