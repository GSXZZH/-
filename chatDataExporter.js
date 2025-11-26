// 聊天数据导出工具类
class ChatDataExporter {
    constructor() {
        this.folderName = 'yonghuliaotianshuju';
        this.exportCount = 0;
    }

    // 导出聊天数据为JSON文件
    exportChatData() {
        try {
            // 获取所有对话数据
            const conversations = JSON.parse(localStorage.getItem('wangpu_conversations') || '[]');
            const users = JSON.parse(localStorage.getItem('wangpu_users') || '[]');
            const currentUser = JSON.parse(localStorage.getItem('wangpu_current_user'));
            
            // 准备导出数据
            const exportData = {
                meta: {
                    exportTime: new Date().toISOString(),
                    version: '1.0',
                    totalConversations: conversations.length,
                    exportedBy: currentUser || 'system'
                },
                conversations: conversations,
                users: users,
                statistics: this.generateStatistics(conversations)
            };
            
            // 生成文件名
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const fileName = `chat_data_${timestamp}.json`;
            
            // 创建数据URL
            const dataStr = JSON.stringify(exportData, null, 2);
            const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
            
            // 创建下载链接并触发下载
            this.downloadFile(dataUri, fileName);
            
            this.exportCount++;
            console.log(`聊天数据导出成功: ${fileName}`);
            
            return {
                success: true,
                fileName: fileName,
                filePath: `${this.folderName}/${fileName}`,
                conversationsCount: conversations.length,
                exportTime: exportData.meta.exportTime
            };
        } catch (error) {
            console.error('聊天数据导出失败', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // 导出指定用户的聊天记录
    exportUserChatData(targetUserId) {
        try {
            const conversations = JSON.parse(localStorage.getItem('wangpu_conversations') || '[]');
            const users = JSON.parse(localStorage.getItem('wangpu_users') || '[]');
            
            // 查找目标用户
            const targetUser = users.find(user => user.id === targetUserId);
            if (!targetUser) {
                throw new Error('目标用户不存在');
            }
            
            // 过滤与该用户相关的对话
            const userConversations = conversations.filter(conversation => 
                conversation.participants.includes(targetUserId)
            );
            
            // 准备导出数据
            const exportData = {
                meta: {
                    exportTime: new Date().toISOString(),
                    version: '1.0',
                    targetUser: targetUser,
                    totalConversations: userConversations.length
                },
                conversations: userConversations,
                users: users.filter(user => 
                    user.id === targetUserId || 
                    userConversations.some(convo => convo.participants.includes(user.id))
                )
            };
            
            // 生成文件名
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const fileName = `chat_data_${targetUser.username}_${timestamp}.json`;
            
            // 创建数据URL
            const dataStr = JSON.stringify(exportData, null, 2);
            const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
            
            // 创建下载链接并触发下载
            this.downloadFile(dataUri, fileName);
            
            console.log(`用户聊天数据导出成功: ${fileName}`);
            
            return {
                success: true,
                fileName: fileName,
                filePath: `${this.folderName}/${fileName}`,
                conversationsCount: userConversations.length,
                targetUser: targetUser.name
            };
        } catch (error) {
            console.error('用户聊天数据导出失败', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // 导出最近的聊天记录
    exportRecentChatData(days = 7) {
        try {
            const conversations = JSON.parse(localStorage.getItem('wangpu_conversations') || '[]');
            const users = JSON.parse(localStorage.getItem('wangpu_users') || '[]');
            
            // 计算时间阈值
            const cutoffTime = new Date();
            cutoffTime.setDate(cutoffTime.getDate() - days);
            
            // 过滤最近的对话
            const recentConversations = conversations.filter(conversation => {
                // 如果对话有消息，检查最后一条消息的时间
                if (conversation.messages && conversation.messages.length > 0) {
                    const lastMessageTime = new Date(conversation.messages[conversation.messages.length - 1].timestamp);
                    return lastMessageTime >= cutoffTime;
                }
                return false;
            });
            
            // 准备导出数据
            const exportData = {
                meta: {
                    exportTime: new Date().toISOString(),
                    version: '1.0',
                    days: days,
                    totalConversations: recentConversations.length,
                    cutoffTime: cutoffTime.toISOString()
                },
                conversations: recentConversations,
                users: users.filter(user => 
                    recentConversations.some(convo => convo.participants.includes(user.id))
                )
            };
            
            // 生成文件名
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const fileName = `recent_chat_data_${days}days_${timestamp}.json`;
            
            // 创建数据URL
            const dataStr = JSON.stringify(exportData, null, 2);
            const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
            
            // 创建下载链接并触发下载
            this.downloadFile(dataUri, fileName);
            
            console.log(`最近聊天数据导出成功: ${fileName}`);
            
            return {
                success: true,
                fileName: fileName,
                filePath: `${this.folderName}/${fileName}`,
                conversationsCount: recentConversations.length,
                days: days
            };
        } catch (error) {
            console.error('最近聊天数据导出失败', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // 自动导出功能（定期备份）
    enableAutoExport(intervalMinutes = 60) {
        try {
            // 清除现有的定时器（如果有）
            if (this.autoExportTimer) {
                clearInterval(this.autoExportTimer);
            }
            
            // 设置新的定时器
            this.autoExportTimer = setInterval(() => {
                const result = this.exportChatData();
                if (result.success) {
                    console.log(`自动导出完成: ${result.fileName}`);
                }
            }, intervalMinutes * 60 * 1000);
            
            console.log(`自动导出功能已启用，间隔: ${intervalMinutes}分钟`);
            
            return {
                success: true,
                intervalMinutes: intervalMinutes
            };
        } catch (error) {
            console.error('自动导出设置失败', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // 禁用自动导出
    disableAutoExport() {
        try {
            if (this.autoExportTimer) {
                clearInterval(this.autoExportTimer);
                this.autoExportTimer = null;
                console.log('自动导出功能已禁用');
                return { success: true };
            }
            return { success: false, error: '自动导出未启用' };
        } catch (error) {
            console.error('禁用自动导出失败', error);
            return { success: false, error: error.message };
        }
    }

    // 生成聊天统计信息
    generateStatistics(conversations) {
        let totalMessages = 0;
        let messageCountByUser = {};
        let conversationsByDate = {};
        
        conversations.forEach(conversation => {
            if (conversation.messages && conversation.messages.length > 0) {
                totalMessages += conversation.messages.length;
                
                // 统计每个用户的消息数
                conversation.messages.forEach(message => {
                    if (!messageCountByUser[message.sender]) {
                        messageCountByUser[message.sender] = 0;
                    }
                    messageCountByUser[message.sender]++;
                    
                    // 按日期统计对话
                    const date = new Date(message.timestamp).toLocaleDateString('zh-CN');
                    if (!conversationsByDate[date]) {
                        conversationsByDate[date] = 0;
                    }
                    conversationsByDate[date]++;
                });
            }
        });
        
        return {
            totalConversations: conversations.length,
            totalMessages: totalMessages,
            messagesPerConversation: conversations.length > 0 ? Math.round(totalMessages / conversations.length * 100) / 100 : 0,
            messageCountByUser: messageCountByUser,
            conversationsByDate: conversationsByDate,
            exportTime: new Date().toISOString()
        };
    }

    // 下载文件到本地
    downloadFile(dataUri, fileName) {
        const linkElement = document.createElement('a');
        
        // 注意：在浏览器环境中，我们无法直接控制下载到特定文件夹
        // 这里设置download属性，浏览器会提示用户选择下载位置或使用默认下载文件夹
        linkElement.setAttribute('download', fileName);
        linkElement.setAttribute('href', dataUri);
        
        // 模拟点击下载
        document.body.appendChild(linkElement);
        linkElement.click();
        document.body.removeChild(linkElement);
        
        // 提示用户保存到指定文件夹
        setTimeout(() => {
            alert(`请将文件保存到 "${this.folderName}" 文件夹中以完成数据备份。`);
        }, 500);
    }

    // 创建导出功能UI按钮（用于添加到页面）
    createExportButton(parentElement, options = {}) {
        const button = document.createElement('button');
        button.className = options.className || 'bg-primary text-white px-4 py-2 rounded-md hover:bg-dark transition-smooth';
        button.innerHTML = options.innerHTML || '<i class="fa fa-download"></i> 导出聊天记录';
        
        button.addEventListener('click', () => {
            const result = this.exportChatData();
            if (result.success) {
                if (options.onSuccess) {
                    options.onSuccess(result);
                } else {
                    alert(`聊天记录已导出: ${result.fileName}`);
                }
            } else {
                if (options.onError) {
                    options.onError(result.error);
                } else {
                    alert(`导出失败: ${result.error}`);
                }
            }
        });
        
        if (parentElement) {
            parentElement.appendChild(button);
        }
        
        return button;
    }

    // 创建导出选项面板
    createExportOptionsPanel(parentElement) {
        const panel = document.createElement('div');
        panel.className = 'bg-white p-4 rounded-lg shadow-custom';
        
        panel.innerHTML = `
            <h3 class="text-lg font-semibold mb-3 text-primary">导出聊天记录</h3>
            <div class="space-y-4">
                <div>
                    <button id="export-all-chats" class="w-full bg-primary text-white px-4 py-2 rounded-md hover:bg-dark transition-smooth">
                        <i class="fa fa-download mr-2"></i>导出所有聊天记录
                    </button>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">导出最近天数</label>
                    <div class="flex space-x-2">
                        <select id="recent-days-select" class="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent">
                            <option value="1">最近1天</option>
                            <option value="3">最近3天</option>
                            <option value="7" selected>最近7天</option>
                            <option value="30">最近30天</option>
                        </select>
                        <button id="export-recent-chats" class="bg-secondary text-white px-4 py-2 rounded-md hover:bg-primary transition-smooth">
                            导出
                        </button>
                    </div>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">自动导出设置</label>
                    <div class="flex space-x-2 items-center">
                        <input type="checkbox" id="auto-export-toggle" class="rounded border-gray-300 text-primary focus:ring-primary">
                        <label for="auto-export-toggle" class="text-sm text-gray-700">启用自动导出</label>
                    </div>
                    <div id="auto-export-options" class="mt-2 hidden">
                        <div class="flex space-x-2">
                            <select id="auto-export-interval" class="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent">
                                <option value="30">30分钟</option>
                                <option value="60" selected>1小时</option>
                                <option value="1440">每天</option>
                            </select>
                            <button id="save-auto-export" class="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 transition-smooth">
                                保存
                            </button>
                        </div>
                    </div>
                </div>
                <div class="text-xs text-gray-500">
                    <p>提示：请确保将导出的文件保存到 "${this.folderName}" 文件夹中。</p>
                </div>
            </div>
        `;
        
        if (parentElement) {
            parentElement.appendChild(panel);
        }
        
        // 绑定事件
        panel.querySelector('#export-all-chats').addEventListener('click', () => {
            this.exportChatData();
        });
        
        panel.querySelector('#export-recent-chats').addEventListener('click', () => {
            const days = parseInt(panel.querySelector('#recent-days-select').value);
            this.exportRecentChatData(days);
        });
        
        panel.querySelector('#auto-export-toggle').addEventListener('change', (e) => {
            panel.querySelector('#auto-export-options').classList.toggle('hidden', !e.target.checked);
        });
        
        panel.querySelector('#save-auto-export').addEventListener('click', () => {
            const intervalMinutes = parseInt(panel.querySelector('#auto-export-interval').value);
            const result = this.enableAutoExport(intervalMinutes);
            if (result.success) {
                alert(`自动导出已设置，间隔：${intervalMinutes}分钟`);
            } else {
                alert(`设置失败：${result.error}`);
            }
        });
        
        return panel;
    }

    // 获取导出历史记录
    getExportHistory() {
        try {
            const history = JSON.parse(localStorage.getItem('wangpu_export_history') || '[]');
            return history;
        } catch (error) {
            console.error('获取导出历史失败', error);
            return [];
        }
    }

    // 记录导出历史
    recordExportHistory(exportInfo) {
        try {
            const history = this.getExportHistory();
            const historyItem = {
                ...exportInfo,
                timestamp: new Date().toISOString()
            };
            
            history.unshift(historyItem);
            
            // 只保留最近20条记录
            if (history.length > 20) {
                history.splice(20);
            }
            
            localStorage.setItem('wangpu_export_history', JSON.stringify(history));
            return true;
        } catch (error) {
            console.error('记录导出历史失败', error);
            return false;
        }
    }
}

// 导出实例
const chatDataExporter = new ChatDataExporter();

// 为了在window对象上访问
globalThis.chatDataExporter = chatDataExporter;