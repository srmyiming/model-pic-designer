/**
 * 服务选择数据结构
 *
 * 问题背景:
 * - 之前使用 Record<string, ServiceSelection>,serviceId 冗余存储两次
 * - Object.values().filter() 性能低,每次遍历所有项
 * - 类型推断不准确
 *
 * 新设计:
 * - Set<string> 存储选中的服务 ID (O(1) 查找)
 * - Map<string, Blob> 存储配件图 (按需存储)
 * - 消除数据冗余,提升性能
 */

export interface ServiceSelections {
  /** 选中的服务 ID 集合 */
  selected: Set<string>;
  /** 服务 ID → 配件图 Blob 的映射 */
  accessories: Map<string, Blob>;
}

/**
 * 创建空的服务选择状态
 */
export const createSelection = (): ServiceSelections => ({
  selected: new Set(),
  accessories: new Map(),
});

/**
 * 切换服务选中状态
 * @param state 当前状态
 * @param serviceId 要切换的服务 ID
 * @returns 新的状态对象
 */
export const toggleService = (
  state: ServiceSelections,
  serviceId: string
): ServiceSelections => {
  const newSelected = new Set(state.selected);
  const newAccessories = new Map(state.accessories);

  if (newSelected.has(serviceId)) {
    // 取消选中时,同时移除配件图
    newSelected.delete(serviceId);
    newAccessories.delete(serviceId);
  } else {
    newSelected.add(serviceId);
  }

  return {
    selected: newSelected,
    accessories: newAccessories,
  };
};

/**
 * 设置服务的配件图
 * @param state 当前状态
 * @param serviceId 服务 ID
 * @param accessory 配件图 Blob (传 null 表示移除)
 * @returns 新的状态对象
 */
export const setAccessory = (
  state: ServiceSelections,
  serviceId: string,
  accessory: Blob | null
): ServiceSelections => {
  const newAccessories = new Map(state.accessories);

  if (accessory === null) {
    newAccessories.delete(serviceId);
  } else {
    newAccessories.set(serviceId, accessory);
  }

  return {
    selected: state.selected,
    accessories: newAccessories,
  };
};

/**
 * 检查选择是否有效
 * @param state 当前状态
 * @param allServices 所有服务配置
 * @returns { valid: boolean, reason?: string }
 */
export const validateSelections = (
  state: ServiceSelections,
  allServices: Array<{ id: string; needsPartImage: boolean; defaultPartImage?: string; titleCN: string }>
): { valid: boolean; reason?: string } => {
  // 至少选择一个服务
  if (state.selected.size === 0) {
    return { valid: false, reason: '请至少选择一个服务' };
  }

  // 检查每个选中的服务
  for (const serviceId of state.selected) {
    const service = allServices.find(s => s.id === serviceId);
    if (!service) continue;

    // 如果需要配件图,检查是否已上传或有默认图
    if (service.needsPartImage) {
      const hasAccessory = state.accessories.has(serviceId);
      const hasDefault = !!service.defaultPartImage;

      if (!hasAccessory && !hasDefault) {
        return {
          valid: false,
          reason: `"${service.titleCN}" 需要上传配件图`,
        };
      }
    }
  }

  return { valid: true };
};
