/**
 * 会话管理工具
 *
 * 问题背景:
 * - 之前使用 localStorage.setItem('isLoggedIn', 'true') 永不过期
 * - 用户关闭浏览器数月后仍保持登录状态,存在安全风险
 *
 * 解决方案:
 * - 添加会话过期时间 (默认 7 天)
 * - 存储 JSON 格式的会话数据,包含过期时间戳
 * - 每次检查时验证是否过期
 */

const SESSION_KEY = 'user_session';
const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 天 (毫秒)

interface SessionData {
  expiry: number; // 过期时间戳
  createdAt: number; // 创建时间戳
}

/**
 * 保存会话
 * 创建新的会话记录,有效期为 7 天
 */
export const saveSession = (): void => {
  const now = Date.now();
  const sessionData: SessionData = {
    expiry: now + SESSION_DURATION,
    createdAt: now,
  };

  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
  } catch (error) {
    console.error('Failed to save session:', error);
  }
};

/**
 * 检查会话是否有效
 * @returns true 如果会话存在且未过期,否则 false
 */
export const isSessionValid = (): boolean => {
  try {
    const dataStr = localStorage.getItem(SESSION_KEY);
    if (!dataStr) {
      return false;
    }

    const sessionData: SessionData = JSON.parse(dataStr);
    const now = Date.now();

    // 检查是否过期
    if (now >= sessionData.expiry) {
      clearSession(); // 自动清理过期会话
      return false;
    }

    return true;
  } catch (error) {
    console.error('Failed to check session:', error);
    clearSession(); // 数据损坏,清理会话
    return false;
  }
};

/**
 * 清除会话
 * 用于用户登出或会话过期时
 */
export const clearSession = (): void => {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch (error) {
    console.error('Failed to clear session:', error);
  }
};

/**
 * 获取会话剩余时间(毫秒)
 * @returns 剩余时间,如果会话无效则返回 0
 */
export const getSessionRemainingTime = (): number => {
  try {
    const dataStr = localStorage.getItem(SESSION_KEY);
    if (!dataStr) {
      return 0;
    }

    const sessionData: SessionData = JSON.parse(dataStr);
    const now = Date.now();
    const remaining = sessionData.expiry - now;

    return remaining > 0 ? remaining : 0;
  } catch (error) {
    console.error('Failed to get session remaining time:', error);
    return 0;
  }
};
