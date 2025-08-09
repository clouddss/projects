import { TestBed } from '@angular/core/testing';
import { CustomNamesService, CustomDisplayName } from './custom-names.service';

describe('CustomNamesService', () => {
  let service: CustomNamesService;
  const mockUserId = 'user123';
  const mockUsername = 'testuser';
  const mockCustomName = 'My Custom Name';

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CustomNamesService);
    
    // Clear localStorage before each test
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should set and get custom name', () => {
    service.setCustomName(mockUserId, mockCustomName, mockUsername);
    
    const result = service.getCustomName(mockUserId);
    expect(result).toEqual({
      userId: mockUserId,
      customName: mockCustomName,
      originalUsername: mockUsername
    });
  });

  it('should return formatted display name with custom name', () => {
    service.setCustomName(mockUserId, mockCustomName, mockUsername);
    
    const formatted = service.getFormattedDisplayName(mockUserId, mockUsername);
    expect(formatted).toBe(`${mockCustomName} (@${mockUsername})`);
  });

  it('should return original username when no custom name is set', () => {
    const formatted = service.getFormattedDisplayName(mockUserId, mockUsername);
    expect(formatted).toBe(mockUsername);
  });

  it('should remove custom name when set to same as original username', () => {
    service.setCustomName(mockUserId, mockCustomName, mockUsername);
    expect(service.getCustomName(mockUserId)).toBeTruthy();
    
    service.setCustomName(mockUserId, mockUsername, mockUsername);
    expect(service.getCustomName(mockUserId)).toBeNull();
  });

  it('should persist custom names in localStorage', () => {
    service.setCustomName(mockUserId, mockCustomName, mockUsername);
    
    // Create new service instance to test persistence
    const newService = new CustomNamesService();
    const result = newService.getCustomName(mockUserId);
    
    expect(result).toEqual({
      userId: mockUserId,
      customName: mockCustomName,
      originalUsername: mockUsername
    });
  });

  it('should remove custom name', () => {
    service.setCustomName(mockUserId, mockCustomName, mockUsername);
    expect(service.getCustomName(mockUserId)).toBeTruthy();
    
    service.removeCustomName(mockUserId);
    expect(service.getCustomName(mockUserId)).toBeNull();
  });

  it('should clear all custom names', () => {
    service.setCustomName('user1', 'Name1', 'username1');
    service.setCustomName('user2', 'Name2', 'username2');
    
    expect(service.getAllCustomNames().size).toBe(2);
    
    service.clearAllCustomNames();
    expect(service.getAllCustomNames().size).toBe(0);
  });

  it('should handle empty or invalid custom names', () => {
    service.setCustomName(mockUserId, '', mockUsername);
    expect(service.getCustomName(mockUserId)).toBeNull();
    
    service.setCustomName(mockUserId, '   ', mockUsername);
    expect(service.getCustomName(mockUserId)).toBeNull();
  });

  it('should trim whitespace from custom names', () => {
    const nameWithSpaces = '  My Custom Name  ';
    service.setCustomName(mockUserId, nameWithSpaces, mockUsername);
    
    const result = service.getCustomName(mockUserId);
    expect(result?.customName).toBe('My Custom Name');
  });
});