/**
 * 数据存储管理类
 * 统一管理应用中的所有数据，包括用户、帖子、公告、聊天等
 */
class DataStore {
    constructor() {
        this.dbName = 'wangpu_community';
        this.dbVersion = 1;
        this._initDefaultData = false;
        // 存储键名前缀
        this._prefix = 'wangpu_';
    }

    /**
     * 初始化数据存储
     */
    async init() {
        // 等待IndexedDB初始化完成
        if (window.persistentStorage && !persistentStorage.initialized) {
            await new Promise(resolve => {
                const checkInit = () => {
                    if (persistentStorage.initialized) resolve();
                    else setTimeout(checkInit, 100);
                };
                checkInit();
            });
        }

        // 初始化默认数据（仅在首次运行时）
        if (!localStorage.getItem(this._prefix + 'initialized') && !this._initDefaultData) {
            this._initDefaultData = true;
            this._createDefaultData();
            localStorage.setItem(this._prefix + 'initialized', 'true');
        }
    }

    /**
     * 创建默认数据
     */
    _createDefaultData() {
        // 默认管理员用户
        if (!this.getUserByUsername('admin')) {
            let adminData = {
                id: '1',
                username: 'admin',
                name: '管理员',
                role: 'admin',
                avatar: 'https://p3-flow-imagex-sign.byteimg.com/tos-cn-i-a9rns2rl98/rc/pc/super_tool/51adbb390f5c4236b836ae8de7b112bc~tplv-a9rns2rl98-image.image?rcl=202511231254528EA2913FE4D8DECDB6BA&rk3s=8e244e95&rrcfp=f06b921b&x-expires=1766465737&x-signature=JkssMmumM3ty2sQXdSisaiWZVmw%3D',
                avatarData: null,
                bio: '系统管理员',
                createdAt: new Date().toISOString()
            };

            // 如果存在authService，则加密密码
            if (window.authService) {
                const salt = authService.generateSalt();
                adminData.password = authService.hashPassword('admin123', salt);
                adminData.salt = salt;
            } else {
                adminData.password = 'admin123';
            }

            this.addUser(adminData);
        }

        // 默认帖子数据
        const defaultPosts = [
            {
                id: '1',
                title: '欢迎加入王朴中学社区',
                content: '欢迎各位同学、老师和家长加入王朴中学社区平台！这里是我们交流学习、分享经验的家园。请遵守社区规范，共同营造良好的交流环境。',
                authorId: '1',
                authorName: '管理员',
                createdAt: new Date().toISOString(),
                likes: 0,
                comments: []
            }
        ];

        const posts = this.getPosts();
        if (posts.length === 0) {
            defaultPosts.forEach(post => {
                this.addPost(post);
            });
        }

        // 默认公告数据
        const defaultAnnouncements = [
            {
                id: '1',
                title: '社区平台正式上线',
                content: '经过紧张的开发和测试，王朴中学社区平台正式上线！请各位用户注册账号，开始使用各项功能。如有任何问题或建议，请联系管理员。',
                createdAt: new Date().toISOString()
            }
        ];

        const announcements = this.getAnnouncements();
        if (announcements.length === 0) {
            defaultAnnouncements.forEach(announcement => {
                this.addAnnouncement(announcement);
            });
        }
    }

    /**
     * 获取所有用户
     */
    getUsers() {
        if (window.persistentStorage) {
            return persistentStorage.getAllData('users') || [];
        }
        return JSON.parse(localStorage.getItem(this._prefix + 'users') || '[]');
    }

    /**
     * 根据ID获取用户
     */
    getUserById(id) {
        const users = this.getUsers();
        return users.find(user => user.id === id);
    }

    /**
     * 根据用户名获取用户（异步）
     */
    async getUserByUsername(username) {
        const users = this.getUsers();
        return users.find(user => user.username === username);
    }

    /**
     * 添加用户
     */
    addUser(userData) {
        const users = this.getUsers();
        
        // 生成唯一ID
        const id = userData.id || (users.length > 0 ? Math.max(...users.map(u => parseInt(u.id))) + 1 : 1).toString();
        
        const newUser = {
            id,
            createdAt: new Date().toISOString(),
            ...userData
        };
        
        users.push(newUser);
        
        // 保存到存储
        if (window.persistentStorage) {
            persistentStorage.saveAllData('users', users);
        } else {
            localStorage.setItem(this._prefix + 'users', JSON.stringify(users));
        }
        
        return newUser;
    }

    /**
     * 更新用户
     */
    updateUser(updatedUser) {
        const users = this.getUsers();
        const index = users.findIndex(user => user.id === updatedUser.id);
        
        if (index !== -1) {
            users[index] = { ...users[index], ...updatedUser, updatedAt: new Date().toISOString() };
            
            // 保存到存储
            if (window.persistentStorage) {
                persistentStorage.saveAllData('users', users);
            } else {
                localStorage.setItem(this._prefix + 'users', JSON.stringify(users));
            }
            
            // 如果是当前用户，更新当前用户缓存
            if (this.getCurrentUser()?.id === updatedUser.id) {
                localStorage.setItem(this._prefix + 'currentUser', JSON.stringify(users[index]));
            }
            
            return true;
        }
        
        return false;
    }

    /**
     * 获取当前用户
     */
    getCurrentUser() {
        const currentUserId = localStorage.getItem(this._prefix + 'currentUserId');
        if (!currentUserId) return null;
        
        // 先从缓存获取
        const cachedUser = localStorage.getItem(this._prefix + 'currentUser');
        if (cachedUser) {
            try {
                const user = JSON.parse(cachedUser);
                if (user.id === currentUserId) {
                    return user;
                }
            } catch (e) {
                console.error('Error parsing cached user:', e);
            }
        }
        
        // 缓存不存在或不匹配时，从用户列表获取
        const user = this.getUserById(currentUserId);
        if (user) {
            localStorage.setItem(this._prefix + 'currentUser', JSON.stringify(user));
        }
        
        return user;
    }

    /**
     * 设置当前用户
     */
    setCurrentUser(userId) {
        const user = this.getUserById(userId);
        if (user) {
            localStorage.setItem(this._prefix + 'currentUserId', userId);
            localStorage.setItem(this._prefix + 'currentUser', JSON.stringify(user));
            return true;
        }
        return false;
    }

    /**
     * 清除当前用户
     */
    clearCurrentUser() {
        localStorage.removeItem(this._prefix + 'currentUserId');
        localStorage.removeItem(this._prefix + 'currentUser');
    }

    /**
     * 获取所有帖子
     */
    getPosts() {
        if (window.persistentStorage) {
            return persistentStorage.getAllData('posts') || [];
        }
        return JSON.parse(localStorage.getItem(this._prefix + 'posts') || '[]');
    }

    /**
     * 添加帖子
     */
    addPost(postData) {
        const posts = this.getPosts();
        const id = postData.id || (posts.length > 0 ? Math.max(...posts.map(p => parseInt(p.id))) + 1 : 1).toString();
        
        const newPost = {
            id,
            createdAt: new Date().toISOString(),
            likes: 0,
            comments: [],
            ...postData
        };
        
        posts.unshift(newPost); // 新帖子添加到开头
        
        if (window.persistentStorage) {
            persistentStorage.saveAllData('posts', posts);
        } else {
            localStorage.setItem(this._prefix + 'posts', JSON.stringify(posts));
        }
        
        return newPost;
    }

    /**
     * 获取所有公告
     */
    getAnnouncements() {
        if (window.persistentStorage) {
            return persistentStorage.getAllData('announcements') || [];
        }
        return JSON.parse(localStorage.getItem(this._prefix + 'announcements') || '[]');
    }

    /**
     * 添加公告
     */
    addAnnouncement(announcementData) {
        const announcements = this.getAnnouncements();
        const id = announcementData.id || (announcements.length > 0 ? Math.max(...announcements.map(a => parseInt(a.id))) + 1 : 1).toString();
        
        const newAnnouncement = {
            id,
            createdAt: new Date().toISOString(),
            ...announcementData
        };
        
        announcements.unshift(newAnnouncement);
        
        if (window.persistentStorage) {
            persistentStorage.saveAllData('announcements', announcements);
        } else {
            localStorage.setItem(this._prefix + 'announcements', JSON.stringify(announcements));
        }
        
        return newAnnouncement;
    }

    /**
     * 获取聊天会话列表
     */
    getConversations() {
        if (window.persistentStorage) {
            return persistentStorage.getAllData('conversations') || [];
        }
        return JSON.parse(localStorage.getItem(this._prefix + 'conversations') || '[]');
    }

    /**
     * 获取文件列表
     */
    getFiles() {
        if (window.persistentStorage) {
            return persistentStorage.getAllData('files') || [];
        }
        return JSON.parse(localStorage.getItem(this._prefix + 'files') || '[]');
    }

    /**
     * 添加文件
     */
    addFile(fileData) {
        const files = this.getFiles();
        const id = fileData.id || (files.length > 0 ? Math.max(...files.map(f => parseInt(f.id))) + 1 : 1).toString();
        
        const newFile = {
            id,
            createdAt: new Date().toISOString(),
            ...fileData
        };
        
        files.push(newFile);
        
        if (window.persistentStorage) {
            persistentStorage.saveAllData('files', files);
        } else {
            localStorage.setItem(this._prefix + 'files', JSON.stringify(files));
        }
        
        return newFile;
    }

    /**
     * 删除文件
     */
    deleteFile(fileId) {
        const files = this.getFiles();
        const updatedFiles = files.filter(file => file.id !== fileId);
        
        if (window.persistentStorage) {
            persistentStorage.saveAllData('files', updatedFiles);
        } else {
            localStorage.setItem(this._prefix + 'files', JSON.stringify(updatedFiles));
        }
        
        return true;
    }
    
    /**
     * 获取所有投票
     */
    getVotes() {
        if (window.persistentStorage) {
            return persistentStorage.getAllData('votes') || [];
        }
        return JSON.parse(localStorage.getItem(this._prefix + 'votes') || '[]');
    }
    
    /**
     * 根据ID获取投票
     */
    getVoteById(id) {
        const votes = this.getVotes();
        return votes.find(vote => vote.id === id);
    }
    
    /**
     * 保存投票
     */
    saveVote(vote) {
        const votes = this.getVotes();
        const index = votes.findIndex(v => v.id === vote.id);
        
        if (index !== -1) {
            // 更新现有投票
            votes[index] = { ...votes[index], ...vote };
        } else {
            // 添加新投票
            votes.push(vote);
        }
        
        if (window.persistentStorage) {
            persistentStorage.saveAllData('votes', votes);
        } else {
            localStorage.setItem(this._prefix + 'votes', JSON.stringify(votes));
        }
        
        return vote;
    }
}

// 创建全局单例实例
window.DataStore = new DataStore();

// 自动初始化
if (window.addEventListener) {
    window.addEventListener('DOMContentLoaded', async () => {
        try {
            await window.DataStore.init();
        } catch (error) {
            console.error('DataStore initialization error:', error);
        }
    });
}