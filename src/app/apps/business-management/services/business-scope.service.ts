import { Injectable, signal, computed } from '@angular/core';

export interface ShopItem {
  id: string;
  name: string;
  type: string; // grocery, clothing, cafe, bookstore, perfumery, etc.
}

export const SHOP_TYPES = [
  { key: 'all', label: 'جميع الأنواع (All Types)' },
  { key: 'grocery', label: 'بقالة (Grocery)' },
  { key: 'clothing', label: 'ملابس (Clothing)' },
  { key: 'cafe', label: 'مقهى (Cafe)' },
  { key: 'perfumery', label: 'عطور (Perfumery)' },
  { key: 'bookstore', label: 'مكتبة (Bookstore)' },
] as const;

@Injectable({ providedIn: 'root' })
export class BusinessScopeService {
  // Shops available under current business
  readonly shops = signal<ShopItem[]>([
    { id: 'main', name: 'المحل الرئيسي (Main Shop)', type: 'grocery' },
  ]);

  readonly selectedShopId = signal<string>('all'); // 'all' or shop id
  readonly selectedShopType = signal<string>('all'); // 'all' or specific type

  // Derived filtered shops
  readonly filteredShops = computed(() => {
    const type = this.selectedShopType();
    const list = this.shops();
    if (type === 'all') return list;
    return list.filter((s) => s.type === type);
  });

  // Unique types present in current business
  readonly uniqueTypesInBusiness = computed(() => {
    const types = new Set(this.shops().map((s) => s.type));
    return Array.from(types);
  });

  // Progressive disclosure rules:
  // 1. Hide both selects if only 1 shop total in business
  readonly shouldHideBothSelectors = computed(() => {
    return this.shops().length <= 1;
  });

  // 2. Hide type select if all shops have only 1 type or if specific shop is selected
  readonly shouldHideTypeSelector = computed(() => {
    if (this.shouldHideBothSelectors()) return true;
    return this.uniqueTypesInBusiness().length <= 1;
  });

  // 3. When a specific shop is chosen, disabling type select and displaying that shop's type
  readonly isTypeSelectorDisabled = computed(() => {
    return this.selectedShopId() !== 'all';
  });

  setSelectedShop(shopId: string): void {
    this.selectedShopId.set(shopId);
    if (shopId !== 'all') {
      const found = this.shops().find((s) => s.id === shopId);
      if (found) {
        this.selectedShopType.set(found.type);
      }
    }
  }

  setSelectedType(typeKey: string): void {
    this.selectedShopType.set(typeKey);
    // If current selected shop does not match the newly selected type, reset to 'all'
    if (this.selectedShopId() !== 'all') {
      const current = this.shops().find((s) => s.id === this.selectedShopId());
      if (current && typeKey !== 'all' && current.type !== typeKey) {
        this.selectedShopId.set('all');
      }
    }
  }

  setShops(shops: ShopItem[]): void {
    this.shops.set(shops);
  }

  addShop(shop: ShopItem): void {
    this.shops.update((current) => [...current, shop]);
  }
}
