// 身份验证和密码处理工具
class AuthService {
    constructor() {
        // 简单的密码强度验证规则
        this.passwordRules = {
            minLength: 6,
            requireNumbers: true,
            requireLetters: true
        };
    }

    // 生成随机盐值
    generateSalt() {
        return crypto.randomBytes(16).toString('hex');
    }

    // 计算密码哈希值
    async hashPassword(password, salt) {
        // 使用SubtleCrypto API进行密码哈希
        const encoder = new TextEncoder();
        const data = encoder.encode(password + salt);
        
        try {
            const hashBuffer = await crypto.subtle.digest('SHA-256', data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        } catch (error) {
            console.error('密码哈希计算失败:', error);
            // 降级方案：使用简单的哈希方法
            return this.fallbackHash(password + salt);
        }
    }

    // 降级哈希方法（当SubtleCrypto不可用时）
    fallbackHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // 转换为32位整数
        }
        // 转换为十六进制字符串
        return Math.abs(hash).toString(16).padStart(16, '0');
    }

    // 验证密码
    async verifyPassword(inputPassword, storedHash, salt) {
        const inputHash = await this.hashPassword(inputPassword, salt);
        return inputHash === storedHash;
    }

    // 验证密码强度
    validatePasswordStrength(password) {
        if (password.length < this.passwordRules.minLength) {
            return { valid: false, message: `密码长度至少需要${this.passwordRules.minLength}个字符` };
        }

        if (this.passwordRules.requireNumbers && !/\d/.test(password)) {
            return { valid: false, message: '密码必须包含数字' };
        }

        if (this.passwordRules.requireLetters && !/[a-zA-Z]/.test(password)) {
            return { valid: false, message: '密码必须包含字母' };
        }

        return { valid: true, message: '密码强度符合要求' };
    }

    // 初始化默认用户密码（加密转换）
    async initDefaultUsers(users) {
        const updatedUsers = [];
        
        for (const user of users) {
            // 检查是否已经是加密密码
            if (!user.salt) {
                const salt = this.generateSalt();
                const hashedPassword = await this.hashPassword(user.password, salt);
                
                updatedUsers.push({
                    ...user,
                    password: hashedPassword,
                    salt: salt
                });
            } else {
                updatedUsers.push(user);
            }
        }
        
        return updatedUsers;
    }
}

// 创建全局AuthService实例
const authService = new AuthService();
window.authService = authService;

// 导出AuthService类供其他模块使用
export { AuthService, authService };