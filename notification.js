// 统一的通知系统
class NotificationSystem {
    constructor() {
        this.container = null;
        this.init();
    }
    
    // 初始化通知容器
    init() {
        // 创建通知容器
        this.container = document.createElement('div');
        this.container.id = 'notification-container';
        this.container.className = 'fixed top-4 right-4 z-50 space-y-2';
        document.body.appendChild(this.container);
    }
    
    // 显示通知
    show(message, type = 'info', duration = 3000) {
        // 创建通知元素
        const notification = document.createElement('div');
        
        // 根据类型设置背景颜色
        let bgColor = 'bg-blue-500';
        if (type === 'success') {
            bgColor = 'bg-green-500';
        } else if (type === 'error') {
            bgColor = 'bg-red-500';
        } else if (type === 'warning') {
            bgColor = 'bg-yellow-500';
        }
        
        notification.className = `${bgColor} text-white px-4 py-3 rounded-md shadow-lg transform transition-all duration-300 opacity-0 translate-x-full`;
        
        // 创建通知内容
        const notificationContent = document.createElement('div');
        notificationContent.className = 'flex items-center justify-between';
        
        // 创建通知文本
        const notificationText = document.createElement('span');
        notificationText.textContent = message;
        
        // 创建关闭按钮
        const closeButton = document.createElement('button');
        closeButton.className = 'ml-4 text-white hover:text-gray-200 focus:outline-none';
        closeButton.innerHTML = '<i class="fa fa-times"></i>';
        closeButton.addEventListener('click', () => {
            this.hide(notification);
        });
        
        // 添加到DOM
        notificationContent.appendChild(notificationText);
        notificationContent.appendChild(closeButton);
        notification.appendChild(notificationContent);
        this.container.appendChild(notification);
        
        // 显示动画
        setTimeout(() => {
            notification.classList.remove('opacity-0', 'translate-x-full');
        }, 10);
        
        // 设置自动隐藏
        if (duration > 0) {
            setTimeout(() => {
                this.hide(notification);
            }, duration);
        }
        
        return notification;
    }
    
    // 隐藏通知
    hide(notification) {
        // 隐藏动画
        notification.classList.add('opacity-0', 'translate-x-full');
        
        // 移除元素
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }
    
    // 显示成功通知
    success(message, duration = 3000) {
        return this.show(message, 'success', duration);
    }
    
    // 显示错误通知
    error(message, duration = 3000) {
        return this.show(message, 'error', duration);
    }
    
    // 显示警告通知
    warning(message, duration = 3000) {
        return this.show(message, 'warning', duration);
    }
    
    // 显示信息通知
    info(message, duration = 3000) {
        return this.show(message, 'info', duration);
    }
}

// 初始化全局通知系统
window.NotificationSystem = NotificationSystem;
window.notificationSystem = new NotificationSystem();