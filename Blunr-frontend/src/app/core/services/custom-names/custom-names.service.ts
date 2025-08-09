import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface CustomDisplayName {
  userId: string;
  customName: string;
  originalUsername: string;
}

@Injectable({
  providedIn: 'root'
})
export class CustomNamesService {
  private readonly STORAGE_KEY = 'blunr_custom_display_names';
  private customNamesSubject = new BehaviorSubject<Map<string, CustomDisplayName>>(new Map());
  
  public customNames$ = this.customNamesSubject.asObservable();

  constructor() {
    this.loadCustomNames();
  }

  /**
   * Load custom names from localStorage
   */
  private loadCustomNames(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        const customNamesMap = new Map<string, CustomDisplayName>();
        
        // Handle both array and object formats for backward compatibility
        if (Array.isArray(parsed)) {
          parsed.forEach((item: CustomDisplayName) => {
            customNamesMap.set(item.userId, item);
          });
        } else if (typeof parsed === 'object') {
          Object.entries(parsed).forEach(([userId, data]: [string, any]) => {
            customNamesMap.set(userId, data as CustomDisplayName);
          });
        }
        
        this.customNamesSubject.next(customNamesMap);
      }
    } catch (error) {
      console.error('Error loading custom names from localStorage:', error);
    }
  }

  /**
   * Save custom names to localStorage
   */
  private saveCustomNames(): void {
    try {
      const customNamesMap = this.customNamesSubject.value;
      const dataToStore: { [key: string]: CustomDisplayName } = {};
      
      customNamesMap.forEach((value, key) => {
        dataToStore[key] = value;
      });
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(dataToStore));
    } catch (error) {
      console.error('Error saving custom names to localStorage:', error);
    }
  }

  /**
   * Set a custom display name for a user
   */
  setCustomName(userId: string, customName: string, originalUsername: string): void {
    if (!userId || !customName.trim()) {
      return;
    }

    const currentMap = new Map(this.customNamesSubject.value);
    const trimmedName = customName.trim();
    
    if (trimmedName === originalUsername) {
      // If custom name equals original username, remove the custom name
      currentMap.delete(userId);
    } else {
      currentMap.set(userId, {
        userId,
        customName: trimmedName,
        originalUsername
      });
    }
    
    this.customNamesSubject.next(currentMap);
    this.saveCustomNames();
  }

  /**
   * Get custom display name for a user
   */
  getCustomName(userId: string): CustomDisplayName | null {
    return this.customNamesSubject.value.get(userId) || null;
  }

  /**
   * Remove custom display name for a user
   */
  removeCustomName(userId: string): void {
    const currentMap = new Map(this.customNamesSubject.value);
    currentMap.delete(userId);
    this.customNamesSubject.next(currentMap);
    this.saveCustomNames();
  }

  /**
   * Get formatted display name with fallback to original username
   * Returns: "Custom Name (@originalusername)" or just "originalusername"
   */
  getFormattedDisplayName(userId: string, originalUsername: string): string {
    const customName = this.getCustomName(userId);
    
    if (customName && customName.customName !== originalUsername) {
      return `${customName.customName} (@${originalUsername})`;
    }
    
    return originalUsername;
  }

  /**
   * Get all custom names (for debugging or export)
   */
  getAllCustomNames(): Map<string, CustomDisplayName> {
    return new Map(this.customNamesSubject.value);
  }

  /**
   * Clear all custom names
   */
  clearAllCustomNames(): void {
    this.customNamesSubject.next(new Map());
    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch (error) {
      console.error('Error clearing custom names from localStorage:', error);
    }
  }
}